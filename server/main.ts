import { PrismaClient } from '@prisma/client';
import { createApi } from './http/api';
import { PrismaStorage } from './repositories/storage';
import { PrismaUserRepository } from './repositories/users';

const port = Number(process.env.API_PORT || '3001');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT inválida.');
const db = new PrismaClient();
const users = new PrismaUserRepository(db);
await db.$connect();
await users.seedAdministrator('artur.patricio@epsa.com');
const server = createApi(new PrismaStorage(db), users, {
  issuer: process.env.OAUTH2_ISSUER || 'https://connect-staging.fi-group.com/identity',
  clientId: process.env.OAUTH2_CLIENTID || 'ext.local',
  redirectUri: process.env.OAUTH2_REDIRECT_URI || 'http://localhost:3000/',
  scope: process.env.OAUTH2_SCOPE || 'openid profile email',
});
server.listen(port, 'localhost', () => console.log(`API disponível em http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => { void db.$disconnect().then(() => process.exit(0)); }));
}
