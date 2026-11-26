import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) throw new Error('Defina DATABASE_URL para executar os testes PostgreSQL.');
const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) throw new Error('Os testes PostgreSQL exigem um servidor local.');
const name = `flowdoc_test_${randomBytes(8).toString('hex')}`;
const admin = new PrismaClient({ datasources: { db: { url: url.toString() } } });
let created = false;
try {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  created = true;
  url.pathname = `/${name}`;
  const env = { ...process.env, DATABASE_URL: url.toString(), FLOWDOC_TEST_DATABASE_URL: url.toString() };
  const migrate = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, stdio: 'inherit' });
  if (migrate.error) throw migrate.error;
  if (migrate.status !== 0) throw new Error('Falha ao migrar o banco de teste.');
  const tests = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/api.test.mjs', 'tests/postgres-domain.test.mjs'], { env, stdio: 'inherit' });
  if (tests.error) throw tests.error;
  if (tests.status !== 0) throw new Error('Os testes PostgreSQL falharam.');
} finally {
  if (created) await admin.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.$disconnect();
}
