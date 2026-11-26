import { createHash, randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { RequestError, handleError, objectInput, readInput, respond as json } from './helpers';
import { isRole, type User, type UserRepository } from '../domain/users';

type Settings = { issuer: string; clientId: string; redirectUri: string; scope: string };
type Transaction = { state: string; nonce: string; expires: number };
type Session = { userId: string; idToken: string; expires: number };
type KeyResolver = ReturnType<typeof createRemoteJWKSet>;
type Provider = { authorizationEndpoint: string; endSessionEndpoint?: string; keys: KeyResolver };

const random = () => randomBytes(32).toString('base64url');
const cookieName = 'flowdoc_session';
const transactionCookie = 'flowdoc_login';

function firstClaim(...values: unknown[]): string {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0) || '';
}

function cookie(req: IncomingMessage, name: string): string | undefined {
  return req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function setCookie(res: ServerResponse, name: string, value: string, maxAge: number, secure: boolean) {
  const existing = res.getHeader('Set-Cookie');
  const cookies = existing === undefined ? [] : Array.isArray(existing) ? existing.map(String) : [String(existing)];
  cookies.push(`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`);
  res.setHeader('Set-Cookie', cookies);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 65536) throw new Error('Corpo da requisição excede o limite.');
  }
  return JSON.parse(body);
}

export async function verifyIdentityToken(
  token: string,
  accessToken: string,
  key: KeyResolver,
  settings: Settings,
  nonce: string,
) {
  const { payload, protectedHeader } = await jwtVerify(token, key, {
    issuer: settings.issuer,
    audience: settings.clientId,
    algorithms: ['RS256'],
    requiredClaims: ['iss', 'aud', 'sub', 'exp', 'iat', 'nonce', 'at_hash'],
  });
  if (!payload.sub || payload.nonce !== nonce ||
      (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== settings.clientId) ||
      (payload.azp !== undefined && payload.azp !== settings.clientId)) {
    throw new Error('Claims OIDC inválidas.');
  }
  if (protectedHeader.alg !== 'RS256') throw new Error('Algoritmo de assinatura inválido.');
  const hash = createHash('sha256').update(accessToken, 'ascii').digest();
  const expectedHash = hash.subarray(0, hash.length / 2).toString('base64url');
  if (payload.at_hash !== expectedHash) throw new Error('Token de acesso não corresponde ao ID token.');
  return payload;
}

export function createAuthMiddleware(
  settings: Settings,
  users: UserRepository,
  getProvider?: () => Promise<Provider>,
) {
  const transactions = new Map<string, Transaction>();
  const sessions = new Map<string, Session>();
  const authenticatedUsers = new WeakMap<IncomingMessage, User>();
  const redirect = new URL(settings.redirectUri);
  if (redirect.protocol !== 'https:' && !(redirect.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirect.hostname))) {
    throw new Error('O endereço de retorno OIDC deve usar HTTPS, exceto em localhost.');
  }
  if (redirect.pathname !== '/' || redirect.search || redirect.hash) throw new Error('O retorno OIDC deve apontar para a raiz do FlowDoc.');
  const secure = redirect.protocol === 'https:';
  let metadataPromise: Promise<Provider> | undefined;

  function metadata() {
    if (getProvider) return getProvider();
    if (!metadataPromise) {
      metadataPromise = (async () => {
        const issuer = new URL(settings.issuer);
        if (issuer.protocol !== 'https:') throw new Error('O emissor OIDC deve usar HTTPS.');
        const url = `${settings.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Falha ao consultar o provedor OIDC (${response.status}).`);
        const data = await response.json() as { issuer?: unknown; authorization_endpoint?: unknown; jwks_uri?: unknown; end_session_endpoint?: unknown };
        if (data.issuer !== settings.issuer || typeof data.authorization_endpoint !== 'string' || typeof data.jwks_uri !== 'string') {
          throw new Error('Metadados OIDC inválidos.');
        }
        if (new URL(data.authorization_endpoint).protocol !== 'https:' || new URL(data.jwks_uri).protocol !== 'https:') {
          throw new Error('Os endpoints OIDC devem usar HTTPS.');
        }
        if (data.end_session_endpoint !== undefined &&
            (typeof data.end_session_endpoint !== 'string' || new URL(data.end_session_endpoint).protocol !== 'https:')) {
          throw new Error('Endpoint de saída OIDC inválido.');
        }
        return {
          authorizationEndpoint: data.authorization_endpoint,
          endSessionEndpoint: data.end_session_endpoint,
          keys: createRemoteJWKSet(new URL(data.jwks_uri)),
        };
      })().catch(error => {
        metadataPromise = undefined;
        throw error;
      });
    }
    return metadataPromise;
  }

  const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url || '/', redirect.origin);
    if (!url.pathname.startsWith('/api/')) return next();
    const now = Date.now();
    for (const [id, transaction] of transactions) if (transaction.expires <= now) transactions.delete(id);
    for (const [id, session] of sessions) if (session.expires <= now) sessions.delete(id);

    try {
      if (url.pathname === '/api/auth/login' && req.method === 'GET') {
        const provider = await metadata();
        const transactionId = random();
        const state = random();
        const nonce = random();
        transactions.set(transactionId, { state, nonce, expires: now + 5 * 60_000 });
        setCookie(res, transactionCookie, transactionId, 300, secure);
        const authorize = new URL(provider.authorizationEndpoint);
        authorize.search = new URLSearchParams({
          client_id: settings.clientId,
          redirect_uri: settings.redirectUri,
          scope: settings.scope,
          response_type: 'id_token token',
          state,
          nonce,
        }).toString();
        return json(res, 200, { authorizationUrl: authorize.toString() });
      }

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers.origin !== redirect.origin) {
        return json(res, 403, { error: 'Origem da requisição não autorizada.' });
      }
      if (url.pathname === '/api/auth/callback' && req.method === 'POST') {
        const transactionId = cookie(req, transactionCookie);
        const transaction = transactionId && transactions.get(transactionId);
        if (transactionId) transactions.delete(transactionId);
        setCookie(res, transactionCookie, '', 0, secure);
        const body = await readJson(req);
        if (!transaction || !body || typeof body !== 'object' ||
            !('state' in body) || body.state !== transaction.state ||
            !('idToken' in body) || typeof body.idToken !== 'string' ||
            !('accessToken' in body) || typeof body.accessToken !== 'string' || !body.accessToken) {
          return json(res, 401, { error: 'Retorno de autenticação inválido ou expirado.' });
        }
        const provider = await metadata();
        const claims = await verifyIdentityToken(body.idToken, body.accessToken, provider.keys, settings, transaction.nonce);
        let user: User;
        try {
          user = await users.authenticate({
            issuer: settings.issuer,
            subject: claims.sub!,
            name: firstClaim(claims.name, claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'], claims.given_name, claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'], claims.preferred_username),
            email: firstClaim(claims.email, claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']),
          });
        } catch (error) {
          if (error instanceof RequestError) throw error;
          console.error('[auth] Falha ao consultar usuários:', error);
          return json(res, 503, { error: 'Não foi possível consultar os usuários.' });
        }
        const sessionId = random();
        const expires = Math.min((claims.exp ?? 0) * 1000, now + 8 * 60 * 60_000);
        sessions.set(sessionId, {
          userId: user.id,
          idToken: body.idToken,
          expires,
        });
        setCookie(res, cookieName, sessionId, Math.floor((expires - now) / 1000), secure);
        if (cookie(req, 'flowdoc_logged_out')) setCookie(res, 'flowdoc_logged_out', '', 0, secure);
        return json(res, 200, { authenticated: true });
      }
      const sessionId = cookie(req, cookieName);
      const session = sessionId && sessions.get(sessionId);
      if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
        if (sessionId) sessions.delete(sessionId);
        setCookie(res, cookieName, '', 0, secure);
        try {
          const provider = await metadata();
          if (!provider.endSessionEndpoint) throw new Error('Provedor não informa endpoint de saída.');
          const logoutUrl = new URL(provider.endSessionEndpoint);
          logoutUrl.searchParams.set('post_logout_redirect_uri', settings.redirectUri);
          if (session) logoutUrl.searchParams.set('id_token_hint', session.idToken);
          return json(res, 200, { authenticated: false, logoutUrl: logoutUrl.toString() });
        } catch (error) {
          console.error('[auth] Falha ao iniciar saída do provedor:', error instanceof Error ? error.message : 'Erro desconhecido');
          return json(res, 503, { error: 'Sessão local encerrada, mas não foi possível sair do provedor de identidade.' });
        }
      }
      const user = session ? await users.get(session.userId) : null;
      if (url.pathname === '/api/auth/session' && req.method === 'GET') {
        return user
          ? json(res, 200, { authenticated: true, name: user.name, email: user.email, role: user.role })
          : json(res, 401, { authenticated: false });
      }
      if (!session || !user) return json(res, 401, { error: 'Autenticação necessária.' });
      if (url.pathname === '/api/users') {
        if (user.role !== 'ADM') return json(res, 403, { error: 'Acesso restrito a administradores.' });
        if (req.method === 'GET') return json(res, 200, { users: await users.list() });
        if (req.method === 'PUT') {
          const id = url.searchParams.get('id');
          const body = objectInput(await readInput(req));
          if (!id || !isRole(body.role)) throw new RequestError(400, 'Informe o usuário e um papel válido.');
          return json(res, 200, { user: await users.setRole(id, body.role) });
        }
        return json(res, 405, { error: 'Método não permitido.' });
      }
      if (url.pathname === '/api/staff' && req.method === 'GET' && (user.role === 'USER' || user.role === 'APPROVER')) {
        return json(res, 403, { error: 'Acesso restrito a organizadores da sprint.' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD' && user.role !== 'ADM' && user.role !== 'DIGITAL' &&
          !(user.role === 'DEV' && url.pathname === '/api/sprint-tasks' && req.method === 'PUT') &&
          !(user.role === 'APPROVER' && url.pathname === '/api/project-review' && req.method === 'POST')) {
        return json(res, 403, { error: 'Você não tem permissão para esta operação.' });
      }
      authenticatedUsers.set(req, user);
      next();
    } catch (error) {
      if (error instanceof RequestError) return handleError(res, error);
      console.error('[auth] Falha na autenticação:', error instanceof Error ? error.message : 'Erro desconhecido');
      json(res, url.pathname === '/api/auth/callback' ? 401 : 503, { error: 'Não foi possível autenticar. Verifique a configuração e tente novamente.' });
    }
  };
  return { middleware, userFor: (req: IncomingMessage) => authenticatedUsers.get(req) };
}
