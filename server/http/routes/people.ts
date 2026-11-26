import { randomUUID } from 'node:crypto';
import { normalizeEmail } from '../../domain/validation';
import { RequestError, objectInput, readInput, respond, text } from '../helpers';
import { idParam, required, type RouteContext } from './common';

export async function peopleRoute({ req, res, url, storage }: RouteContext) {
  const isTeam = url.pathname === '/api/teams';
  if (req.method === 'GET') return respond(res, 200, await storage.read(async db => isTeam ? { teams: await db.teams.list() } : { staff: await db.staff.list() }));
  if (req.method === 'POST' || req.method === 'PUT') {
    const data = objectInput(await readInput(req));
    const name = text(data.name, 'o nome');
    const id = req.method === 'POST' ? randomUUID() : idParam(url);
    await storage.transaction(async db => {
      if (isTeam) {
        if (req.method === 'PUT') await required(db.teams.get(id), 'Equipe');
        await db.teams.save({ id, name, description: text(data.description, 'a descrição', false) });
      } else {
        const original = req.method === 'PUT' ? await required(db.staff.get(id), 'Colaborador') : null;
        const teamId = text(data.teamId, 'a equipe');
        await required(db.teams.get(teamId), 'Equipe');
        const normalizedEmail = normalizeEmail(data.email === undefined ? original?.email : data.email);
        const duplicate = normalizedEmail ? await db.staff.byEmail(normalizedEmail) : null;
        if (duplicate && duplicate.id !== id) throw new RequestError(409, 'Já existe um colaborador com este e-mail.');
        await db.staff.save({ id, name, email: normalizedEmail, teamId });
      }
    });
    return respond(res, req.method === 'POST' ? 201 : 200, { id });
  }
  if (req.method === 'DELETE') {
    const id = idParam(url);
    await storage.transaction(async db => {
      if (isTeam) {
        await required(db.teams.get(id), 'Equipe');
        if ((await db.staff.list()).some(item => item.teamId === id)) throw new RequestError(409, 'Remova os colaboradores da equipe antes de excluí-la.');
        await db.teams.delete(id);
      } else {
        await required(db.staff.get(id), 'Colaborador');
        for (const participant of await db.participants.byStaff(id)) {
          if ((await db.tasks.byParticipant(participant.id)).length) throw new RequestError(409, 'Remova as tarefas alocadas antes de excluir o colaborador.');
        }
        await db.staff.delete(id);
      }
    });
    return respond(res, 200, { deleted: id });
  }
  return respond(res, 405, { error: 'Método não permitido.' });
}
