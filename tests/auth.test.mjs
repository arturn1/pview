import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { createServer, isFileLoadingAllowed, resolveConfig } from 'vite';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';

test('login OIDC valida retorno, cria sessão e protege a API', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { createAuthMiddleware } = await vite.ssrLoadModule('/server/http/auth.ts');
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256' };
    const keys = createLocalJWKSet({ keys: [jwk] });
    const settings = { issuer: 'https://identity.example.test', clientId: 'ext.local', redirectUri: 'http://localhost:3000/', scope: 'openid profile email' };
    let logoutAvailable = true;
    let activeUser;
    const users = {
      async authenticate(identity) { activeUser = { id: 'test-user', name: identity.name, email: identity.email, role: 'ADM' }; return activeUser; },
      async get() { return activeUser; },
      async list() { return [activeUser]; },
      async setRole() { throw new Error('unexpected'); },
      async seedAdministrator() {},
    };
    const middleware = createAuthMiddleware(settings, users, async () => ({
      authorizationEndpoint: 'https://identity.example.test/authorize',
      endSessionEndpoint: logoutAvailable ? 'https://identity.example.test/endsession' : undefined,
      keys,
    })).middleware;

    async function request(path, { method = 'GET', cookie = '', origin, body } = {}) {
      const req = Readable.from(body ? [JSON.stringify(body)] : []);
      req.url = path;
      req.method = method;
      req.headers = { cookie, ...(origin ? { origin } : {}) };
      const headers = {};
      let output = '';
      let nextCalled = false;
      const res = {
        statusCode: 200,
        setHeader: (name, value) => { headers[name.toLowerCase()] = value; },
        getHeader: name => headers[name.toLowerCase()],
        writeHead: (status, values) => { res.statusCode = status; Object.entries(values).forEach(([name, value]) => res.setHeader(name, value)); },
        end: value => { output = value || ''; },
      };
      await middleware(req, res, () => { nextCalled = true; });
      return { status: res.statusCode, headers, body: output && JSON.parse(output), nextCalled };
    }

    assert.equal((await request('/api/projects')).status, 401);
    assert.equal((await request('/api/sprints')).status, 401);
    const login = await request('/api/auth/login');
    assert.equal(login.status, 200);
    const authorize = new URL(login.body.authorizationUrl);
    assert.equal(authorize.searchParams.get('response_type'), 'id_token token');
    assert.equal(authorize.searchParams.get('redirect_uri'), settings.redirectUri);
    const loginCookie = login.headers['set-cookie'][0].split(';')[0];
    const accessToken = 'test-access-token';
    const hash = createHash('sha256').update(accessToken).digest().subarray(0, 16).toString('base64url');
    const makeToken = (nonce, audience = settings.clientId, expiration = '5m', signingKey = privateKey, claims = {}) => new SignJWT({ nonce, at_hash: hash, name: 'Pessoa de teste', email: 'pessoa@example.test', ...claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(settings.issuer).setAudience(audience).setSubject('test-subject')
      .setIssuedAt().setExpirationTime(expiration).sign(signingKey);
    const token = await makeToken(authorize.searchParams.get('nonce'));
    const body = { idToken: token, accessToken, state: authorize.searchParams.get('state') };
    const callback = await request('/api/auth/callback', { method: 'POST', cookie: loginCookie, origin: 'http://localhost:3000', body });
    assert.equal(callback.status, 200);
    const sessionCookie = callback.headers['set-cookie'].find(value => value.startsWith('flowdoc_session=')).split(';')[0];
    assert.equal((await request('/api/auth/session', { cookie: sessionCookie })).body.name, 'Pessoa de teste');
    assert.equal((await request('/api/auth/session', { cookie: sessionCookie })).body.email, 'pessoa@example.test');
    activeUser.role = 'USER';
    assert.equal((await request('/api/staff', { cookie: sessionCookie })).status, 403);
    activeUser.role = 'ADM';
    assert.equal((await request('/api/projects', { cookie: sessionCookie })).nextCalled, true);
    assert.equal((await request('/api/project', { method: 'POST', cookie: sessionCookie, origin: 'https://evil.example' })).status, 403);
    assert.equal((await request('/api/auth/callback', { method: 'POST', cookie: loginCookie, origin: 'http://localhost:3000', body })).status, 401);
    const logout = await request('/api/auth/logout', { method: 'POST', cookie: sessionCookie, origin: 'http://localhost:3000' });
    assert.equal(logout.status, 200);
    const endSession = new URL(logout.body.logoutUrl);
    assert.equal(endSession.origin + endSession.pathname, 'https://identity.example.test/endsession');
    assert.equal(endSession.searchParams.get('id_token_hint'), token);
    assert.equal(endSession.searchParams.get('post_logout_redirect_uri'), settings.redirectUri);
    assert.equal((await request('/api/projects', { cookie: sessionCookie })).status, 401);
    assert.deepEqual((await request('/api/auth/session', { cookie: 'flowdoc_logged_out=1' })).body, { authenticated: false });

    const loginAgain = await request('/api/auth/login');
    const loginAgainParams = new URL(loginAgain.body.authorizationUrl).searchParams;
    const loginAgainCookie = loginAgain.headers['set-cookie'][0].split(';')[0];
    const callbackAgain = await request('/api/auth/callback', {
      method: 'POST', cookie: `${loginAgainCookie}; flowdoc_logged_out=1`, origin: 'http://localhost:3000',
      body: { idToken: await makeToken(loginAgainParams.get('nonce'), settings.clientId, '5m', privateKey, {
        name: undefined, email: undefined,
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'Pessoa Fanti',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'fanti@example.test',
      }), accessToken, state: loginAgainParams.get('state') },
    });
    assert.equal(callbackAgain.status, 200);
    assert.ok(callbackAgain.headers['set-cookie'].some(value => value.startsWith('flowdoc_logged_out=;') && value.includes('Max-Age=0')));
    const newSessionCookie = callbackAgain.headers['set-cookie'].find(value => value.startsWith('flowdoc_session=')).split(';')[0];
    assert.deepEqual((await request('/api/auth/session', { cookie: newSessionCookie })).body, { authenticated: true, name: 'Pessoa Fanti', email: 'fanti@example.test', role: 'ADM' });
    logoutAvailable = false;
    const failedLogout = await request('/api/auth/logout', { method: 'POST', cookie: newSessionCookie, origin: 'http://localhost:3000' });
    assert.equal(failedLogout.status, 503);
    assert.match(failedLogout.body.error, /Sessão local encerrada/);
    assert.equal((await request('/api/projects', { cookie: newSessionCookie })).status, 401);

    const otherKey = await generateKeyPair('RS256');
    for (const invalid of ['state', 'nonce', 'audience', 'accessToken', 'expiration', 'signature']) {
      const attempt = await request('/api/auth/login');
      const params = new URL(attempt.body.authorizationUrl).searchParams;
      const attemptCookie = attempt.headers['set-cookie'][0].split(';')[0];
      const invalidToken = await makeToken(
        invalid === 'nonce' ? 'wrong' : params.get('nonce'),
        invalid === 'audience' ? 'wrong' : settings.clientId,
        invalid === 'expiration' ? '1 second ago' : '5m',
        invalid === 'signature' ? otherKey.privateKey : privateKey,
      );
      const result = await request('/api/auth/callback', {
        method: 'POST',
        cookie: attemptCookie,
        origin: 'http://localhost:3000',
        body: { idToken: invalidToken, accessToken: invalid === 'accessToken' ? 'wrong' : accessToken, state: invalid === 'state' ? 'wrong' : params.get('state') },
      });

      assert.equal(result.status, 401, invalid);
      assert.ok(!result.headers['set-cookie'].some(value => value.startsWith('flowdoc_session=')));
    }
  } finally {
    await vite.close();
  }
});

test('acesso sem sessão inicia login e saída redireciona ao provedor', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const requests = [];
  let destination;
  let legacyLoggedOut = false;
  let authenticated = false;
  let sessionRole = 'USER';
  try {
    globalThis.window = {
      location: { hash: '', assign: url => { destination = url; } },
      history: { replaceState() {} },
    };
    globalThis.fetch = async (url, options) => {
      requests.push([url, options]);
      if (url === '/api/auth/session') return authenticated
        ? Response.json({ authenticated: true, name: 'Pessoa de teste', email: 'pessoa@example.test', role: sessionRole })
        : new Response(JSON.stringify({ authenticated: false, loggedOut: legacyLoggedOut }), { status: 401 });
      if (url === '/api/auth/login') return new Response(JSON.stringify({ authorizationUrl: 'https://identity.example.test/authorize' }));
      if (url === '/api/auth/logout') return new Response(JSON.stringify({ logoutUrl: 'https://identity.example.test/endsession' }));
      throw new Error(`Requisição inesperada: ${url}`);
    };
    const { initializeAuth, endSession } = await vite.ssrLoadModule('/src/components/common/AuthGate.tsx');
    assert.deepEqual(await initializeAuth(), { status: 'redirecting', action: 'login' });
    assert.deepEqual(requests.map(([url]) => url), ['/api/auth/session', '/api/auth/login']);
    assert.equal(destination, 'https://identity.example.test/authorize');
    legacyLoggedOut = true;
    destination = undefined;
    assert.deepEqual(await initializeAuth(), { status: 'redirecting', action: 'login' });
    assert.equal(destination, 'https://identity.example.test/authorize');
    assert.deepEqual(requests.map(([url]) => url), ['/api/auth/session', '/api/auth/login', '/api/auth/session', '/api/auth/login']);
    await endSession();
    assert.equal(destination, 'https://identity.example.test/endsession');
    assert.equal(requests[4][1].method, 'POST');
    authenticated = true;
    assert.deepEqual(await initializeAuth(), { status: 'authenticated', user: { name: 'Pessoa de teste', email: 'pessoa@example.test', role: 'USER' } });
    sessionRole = 'APPROVER';
    assert.deepEqual(await initializeAuth(), { status: 'authenticated', user: { name: 'Pessoa de teste', email: 'pessoa@example.test', role: 'APPROVER' } });
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
    await vite.close();
  }
});

test('configuração do Vite não serve o banco SQLite nem seus arquivos auxiliares', async () => {
  const config = await resolveConfig({}, 'serve');
  for (const name of ['flowdoc.db', 'flowdoc.db-wal', 'flowdoc.db-shm']) {
    assert.equal(isFileLoadingAllowed(config, path.resolve(name)), false, name);
  }
});
