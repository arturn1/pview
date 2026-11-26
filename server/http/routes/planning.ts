import { randomUUID } from 'node:crypto';
import type { StorageSession, TaskRecord } from '../../domain/storage';
import { RequestError, minutes, objectInput, readInput, respond, text } from '../helpers';
import { idParam, required, type RouteContext } from './common';

async function validateTask(db: StorageSession, data: Record<string, unknown>, id: string, original?: TaskRecord): Promise<TaskRecord> {
  const participantId = text(data.participantId, 'o participante');
  if (original && participantId !== original.participantId) throw new RequestError(400, 'Não é possível alterar o participante da tarefa.');
  const participant = await required(db.participants.get(participantId), 'Participante');
  const sprint = await required(db.sprints.get(participant.sprintId), 'Sprint');
  const projectId = text(data.projectId, 'o projeto');
  if (!sprint.projectIds.includes(projectId)) throw new RequestError(400, 'O projeto deve estar vinculado à sprint.');
  const featureId = data.featureId === null ? null : text(data.featureId, 'a funcionalidade');
  if (featureId) {
    const project = await required(db.projects.get(projectId), 'Projeto');
    const parsed: unknown = JSON.parse(project.data);
    if (!parsed || typeof parsed !== 'object' || !('nodes' in parsed) || !Array.isArray(parsed.nodes)) throw new Error('Dados do projeto inválidos.');
    if (!parsed.nodes.some(node => node && typeof node === 'object' && node.id === featureId && node.type === 'feature')) {
      throw new RequestError(400, 'A funcionalidade não pertence ao projeto.');
    }
  }
  const taskNumber = data.taskNumber;
  if (typeof taskNumber !== 'number' || !Number.isSafeInteger(taskNumber) || taskNumber <= 0) throw new RequestError(400, 'Informe um número de tarefa inteiro e positivo.');
  return {
    id, participantId, projectId, featureId, taskNumber, title: text(data.title ?? '', 'o título', false),
    devOpsUrl: original?.devOpsUrl ?? null,
    plannedMinutes: data.plannedMinutes === null ? null : minutes(data.plannedMinutes, 'Horas planejadas'),
    actualMinutes: data.actualMinutes === null ? null : minutes(data.actualMinutes, 'Horas reais'),
    lessons: text(data.lessons, 'as lições', false), challenges: text(data.challenges, 'os desafios', false),
    reviewNotes: text(data.reviewNotes, 'as observações de revisão', false),
    deployDate: original?.deployDate ?? null,
  };
}

export async function planningRoute({ req, res, url, storage, userFor }: RouteContext) {
  const path = url.pathname;
  if (path === '/api/sprint-plan' && req.method === 'GET') {
    const sprintId = text(url.searchParams.get('sprintId'), 'a sprint');
    const role = userFor(req)?.role;
    const plan = await storage.read(async db => {
      await required(db.sprints.get(sprintId), 'Sprint');
      const tasks = await db.tasks.bySprint(sprintId);
      if (role === 'USER' || role === 'APPROVER') {
        return {
          tasks: tasks.map(({ taskNumber, title, projectId, featureId, plannedMinutes, actualMinutes, deployDate }) => ({
            taskNumber, title, projectId, featureId, plannedMinutes, actualMinutes, deployDate: deployDate ?? null,
          })),
        };
      }
      const participants = await Promise.all((await db.participants.bySprint(sprintId)).map(async p => {
        const person = await required(db.staff.get(p.staffId), 'Colaborador');
        const team = await required(db.teams.get(person.teamId), 'Equipe');
        return { ...p, staffName: person.name, teamName: team.name };
      }));
      return { participants, tasks };
    });
    return respond(res, 200, plan);
  }
  if (path === '/api/sprint-participants') {
    if (req.method === 'POST') {
      const data = objectInput(await readInput(req));
      const sprintId = text(data.sprintId, 'a sprint');
      const staffId = text(data.staffId, 'o colaborador');
      const totalMinutes = minutes(data.totalMinutes, 'Capacidade');
      const id = randomUUID();
      await storage.transaction(async db => {
        await required(db.sprints.get(sprintId), 'Sprint');
        await required(db.staff.get(staffId), 'Colaborador');
        if (await db.participants.bySprintAndStaff(sprintId, staffId)) throw new RequestError(409, 'Colaborador já participa desta sprint.');
        await db.participants.save({ id, sprintId, staffId, totalMinutes });
      });
      return respond(res, 201, { id });
    }
    if (req.method === 'PUT' || req.method === 'DELETE') {
      const id = idParam(url);
      const data = req.method === 'PUT' ? objectInput(await readInput(req)) : null;
      await storage.transaction(async db => {
        const participant = await required(db.participants.get(id), 'Participante');
        if (data) await db.participants.save({ ...participant, totalMinutes: minutes(data.totalMinutes, 'Capacidade') });
        else {
          if ((await db.tasks.byParticipant(id)).length) throw new RequestError(409, 'Remova as tarefas antes de excluir o participante.');
          await db.participants.delete(id);
        }
      });
      return respond(res, 200, req.method === 'PUT' ? { id } : { deleted: id });
    }
  }
  if (path === '/api/sprint-task-deploy' && req.method === 'PUT') {
    if (userFor(req)?.role !== 'ADM') throw new RequestError(403, 'Somente administradores podem definir a data de deploy.');
    const data = objectInput(await readInput(req));
    const ids = data.taskIds;
    if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string' || !id)) throw new RequestError(400, 'Selecione ao menos uma tarefa.');
    const deployDate = data.deployDate === null ? null : text(data.deployDate, 'a data de deploy');
    if (deployDate !== null) {
      const parsed = new Date(`${deployDate}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(deployDate) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== deployDate) {
        throw new RequestError(400, 'Informe uma data de deploy válida.');
      }
    }
    const uniqueIds = [...new Set(ids as string[])];
    await storage.transaction(async db => {
      const tasks = await Promise.all(uniqueIds.map(id => required(db.tasks.get(id), 'Tarefa')));
      for (const task of tasks) await db.tasks.save({ ...task, deployDate });
    });
    return respond(res, 200, { updated: uniqueIds.length, deployDate });
  }
  if (path === '/api/sprint-tasks') {
    if (req.method === 'POST' || req.method === 'PUT') {
      const id = req.method === 'POST' ? randomUUID() : idParam(url);
      const data = objectInput(await readInput(req));
      const task = await storage.transaction(async db => {
        const original = req.method === 'PUT' ? await required(db.tasks.get(id), 'Tarefa') : undefined;
        const user = userFor(req);
        if (!user) throw new RequestError(401, 'Autenticação necessária.');
        if (user.role === 'DEV') {
          if (!original) throw new RequestError(403, 'Você não tem permissão para esta operação.');
          const participant = await required(db.participants.get(original.participantId), 'Participante');
          const person = await required(db.staff.get(participant.staffId), 'Colaborador');
          if (person.email !== user.email) throw new RequestError(403, 'Você só pode editar suas próprias tarefas.');
        }
        const value = await validateTask(db, data, id, original);
        await db.tasks.save(value);
        return value;
      });
      return respond(res, req.method === 'POST' ? 201 : 200, { task });
    }
    if (req.method === 'DELETE') {
      const id = idParam(url);
      await storage.transaction(async db => { await required(db.tasks.get(id), 'Tarefa'); await db.tasks.delete(id); });
      return respond(res, 200, { deleted: id });
    }
  }
  return respond(res, 405, { error: 'Método não permitido.' });
}
