import { RequestError, objectInput, readInput, respond, text } from '../helpers';
import type { RouteContext } from './common';

export async function projectsRoute({ req, res, url, storage }: RouteContext) {
  if (url.pathname === '/api/projects' && req.method === 'GET') {
    const projects = await storage.read(async db => (await db.projects.list()).map(row => {
      const value: unknown = JSON.parse(row.data);
      if (!value || typeof value !== 'object' || !('name' in value) || typeof value.name !== 'string') throw new Error(`Projeto ${row.id} sem nome válido.`);
      return { id: row.id, name: value.name };
    }));
    return respond(res, 200, projects);
  }
  if (url.pathname === '/api/project') {
    const id = url.searchParams.get('id') || 'proj_gestor_projetos';
    if (req.method === 'GET') {
      const project = await storage.read(db => db.projects.get(id));
      if (!project) throw new RequestError(404, 'Projeto não encontrado.');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      return res.end(project.data);
    }
    if (req.method === 'POST') {
      const project = objectInput(await readInput(req, 5 * 1024 * 1024));
      const projectId = text(project.id, 'o ID do projeto');
      await storage.transaction(async db => {
        const links = (await db.tasks.byProject(projectId)).filter(task => task.featureId !== null);
        if (links.length && (!Array.isArray(project.nodes) || links.some(link => !Array.isArray(project.nodes) || !project.nodes.some(node => node && typeof node === 'object' && node.id === link.featureId && node.type === 'feature')))) {
          throw new RequestError(409, 'Remova os vínculos das tarefas antes de excluir funcionalidades do projeto.');
        }
        await db.projects.save({ id: projectId, data: JSON.stringify(project), updatedAt: new Date() });
      });
      return respond(res, 200, { success: true, savedAt: new Date().toISOString() });
    }
    if (req.method === 'DELETE') {
      await storage.transaction(async db => {
        if ((await db.tasks.byProject(id)).length) throw new RequestError(409, 'Remova as tarefas vinculadas antes de excluir o projeto.');
        if (await db.projects.get(id)) await db.projects.delete(id);
      });
      return respond(res, 200, { success: true, deleted: id });
    }
  }
  return respond(res, 405, { error: 'Método não permitido.' });
}
