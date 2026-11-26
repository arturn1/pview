import { createServer } from 'node:http';
import { createAuthMiddleware } from './auth';
import { createDomainMiddleware } from './routes';
import { handleError, respond } from './helpers';
import type { Storage } from '../domain/storage';
import type { UserRepository } from '../domain/users';

type Settings = Parameters<typeof createAuthMiddleware>[0];

export function createApi(storage: Storage, users: UserRepository, settings: Settings, provider?: Parameters<typeof createAuthMiddleware>[2]) {
  const auth = createAuthMiddleware(settings, users, provider);
  const middlewares = [auth.middleware, createDomainMiddleware(storage, auth.userFor)];

  return createServer((req, res) => {
    let index = 0;
    const next = () => {
      const middleware = middlewares[index++];
      if (!middleware) return respond(res, 404, { error: 'Rota não encontrada.' });
      try {
        Promise.resolve(middleware(req, res, next)).catch(error => handleError(res, error));
      } catch (error) {
        handleError(res, error);
      }
    };
    next();
  });
}
