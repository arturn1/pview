import { randomUUID } from 'node:crypto';
import { RequestError, objectInput, readInput, respond, text } from '../helpers';
import { idParam, required, type RouteContext } from './common';

function numberParam(url: URL, name: string, fallback: number, max: number) {
  const raw = url.searchParams.get(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < 1 || value > max) throw new RequestError(400, `Parâmetro ${name} inválido.`);
  return value;
}

function dateValid(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function sprintsRoute({ req, res, url, storage }: RouteContext) {
  if (req.method === 'GET') {
    const page = numberParam(url, 'page', 1, 1000000);
    const size = numberParam(url, 'pageSize', 12, 100);
    return respond(res, 200, await storage.read(db => db.sprints.page(url.searchParams.get('projectId'), (url.searchParams.get('search') ?? '').trim().toLocaleLowerCase(), page, size)));
  }
  if (req.method === 'POST' || req.method === 'PUT') {
    const data = objectInput(await readInput(req));
    const name = text(data.name, 'o nome');
    const objective = text(data.objective, 'o objetivo');
    const startDate = text(data.startDate, 'a data inicial');
    const endDate = text(data.endDate, 'a data final');
    if (!dateValid(startDate) || !dateValid(endDate) || endDate < startDate) throw new RequestError(400, 'Informe datas válidas; o fim não pode anteceder o início.');
    if (!Array.isArray(data.projectIds) || !data.projectIds.length || !data.projectIds.every(id => typeof id === 'string' && id.length > 0) || new Set(data.projectIds).size !== data.projectIds.length) throw new RequestError(400, 'Selecione ao menos um projeto, sem duplicatas.');
    const projectIds: string[] = data.projectIds;
    const id = req.method === 'POST' ? randomUUID() : idParam(url);
    const sprint = await storage.transaction(async db => {
      if (req.method === 'PUT') {
        await required(db.sprints.get(id), 'Sprint');
        if ((await db.tasks.bySprint(id)).some(task => !projectIds.includes(task.projectId))) throw new RequestError(409, 'Remova as tarefas antes de desvincular um projeto da sprint.');
      }
      for (const projectId of projectIds) if (!await db.projects.get(projectId)) throw new RequestError(400, 'Um dos projetos selecionados não existe.');
      await db.sprints.save({ id, name, objective, startDate, endDate, projectIds });
      return required(db.sprints.get(id), 'Sprint');
    });
    return respond(res, req.method === 'POST' ? 201 : 200, { sprint });
  }
  if (req.method === 'DELETE') {
    const id = idParam(url);
    await storage.transaction(async db => {
      await required(db.sprints.get(id), 'Sprint');
      if ((await db.tasks.bySprint(id)).length) throw new RequestError(409, 'Remova as tarefas antes de excluir a sprint.');
      await db.sprints.delete(id);
    });
    return respond(res, 200, { deleted: id });
  }
  return respond(res, 405, { error: 'Método não permitido.' });
}
