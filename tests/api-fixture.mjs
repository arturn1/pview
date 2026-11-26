import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { PrismaClient } from '@prisma/client';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createServer } from 'vite';

export async function createApiFixture() {
  const databaseUrl = process.env.FLOWDOC_TEST_DATABASE_URL;
  assert.ok(databaseUrl, 'Configure FLOWDOC_TEST_DATABASE_URL para um banco de teste dedicado.');
  assert.match(new URL(databaseUrl).pathname, /^\/flowdoc_test_[a-z0-9]+$/, 'O teste exige um banco isolado.');
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  let server;
  async function close() {
    try {
      if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    } finally {
      try { await db.$disconnect(); } finally { await vite.close(); }
    }
  }
  try {
    const { PrismaStorage } = await vite.ssrLoadModule('/server/repositories/storage.ts');
    const { PrismaUserRepository } = await vite.ssrLoadModule('/server/repositories/users.ts');
    const { createApi } = await vite.ssrLoadModule('/server/http/api.ts');
    const { NotificationService } = await vite.ssrLoadModule('/server/notifications/notification-service.ts');
    const users = new PrismaUserRepository(db);
    const settings = { issuer: 'https://identity.example.test', clientId: 'test', redirectUri: 'http://localhost:3000/', scope: 'openid profile email' };
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = { ...await exportJWK(publicKey), kid: 'test', alg: 'RS256' };
    const storage = new PrismaStorage(db);
    const emails = [];
    const notifier = new NotificationService(storage, { send: async message => { emails.push(message); } });
    server = createApi(storage, users, settings, async () => ({ authorizationEndpoint: `${settings.issuer}/authorize`, keys: createLocalJWKSet({ keys: [jwk] }) }), notifier);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;

    async function login(email, subject) {
      const start = await fetch(`${base}/api/auth/login`);
      const params = new URL((await start.json()).authorizationUrl).searchParams;
      const accessToken = 'test-access-token';
      const atHash = createHash('sha256').update(accessToken).digest().subarray(0, 16).toString('base64url');
      const idToken = await new SignJWT({ nonce: params.get('nonce'), at_hash: atHash, name: email, email })
        .setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer(settings.issuer).setAudience(settings.clientId)
        .setSubject(subject).setIssuedAt().setExpirationTime('5m').sign(privateKey);
      const callback = await fetch(`${base}/api/auth/callback`, {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', cookie: start.headers.getSetCookie()[0].split(';')[0], 'content-type': 'application/json' },
        body: JSON.stringify({ idToken, accessToken, state: params.get('state') }),
      });
      return { status: callback.status, cookie: callback.headers.getSetCookie().find(value => value.startsWith('flowdoc_session='))?.split(';')[0] };
    }

    async function request(cookie, path, method = 'GET', body) {
      const response = await fetch(`${base}${path}`, {
        method, headers: { origin: 'http://localhost:3000', ...(cookie ? { cookie } : {}), 'content-type': 'application/json' },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, body: await response.json() };
    }
    return { db, storage, users, emails, login, request, close };
  } catch (error) {
    await close();
    throw error;
  }
}
