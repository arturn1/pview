import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Storage } from '../../domain/storage';
import type { User } from '../../domain/users';
import { handleError } from '../helpers';
import type { RouteContext } from './common';
import { projectsRoute } from './projects';
import { sprintsRoute } from './sprints';
import { peopleRoute } from './people';
import { planningRoute } from './planning';
import { devOpsRoute } from './devops';

const routes: Record<string, (context: RouteContext) => Promise<void | ServerResponse>> = {
  '/api/projects': projectsRoute,
  '/api/project': projectsRoute,
  '/api/sprints': sprintsRoute,
  '/api/teams': peopleRoute,
  '/api/staff': peopleRoute,
  '/api/sprint-plan': planningRoute,
  '/api/sprint-participants': planningRoute,
  '/api/sprint-tasks': planningRoute,
  '/api/sprint-import-devops': devOpsRoute,
  '/api/sprint-import-devops/preview': devOpsRoute,
};

export function createDomainMiddleware(storage: Storage, userFor: (req: IncomingMessage) => User | undefined) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const route = routes[url.pathname];
    if (!route) return next();
    try {
      return await route({ req, res, url, storage, userFor });
    } catch (error) {
      return handleError(res, error);
    }
  };
}
