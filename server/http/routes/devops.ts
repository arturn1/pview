import { createHash, randomUUID } from 'node:crypto';
import type { StorageSession, TaskRecord } from '../../domain/storage';
import { parseDevOpsWorkbook } from '../../imports/devops-workbook';
import { RequestError, objectInput, readInput, respond, text } from '../helpers';
import type { RouteContext } from './common';

type ImportTask = Awaited<ReturnType<typeof parseDevOpsWorkbook>>[number];

async function inspectImport(db: StorageSession, sprintId: string, projectId: string, teamId: string, tasks: ImportTask[]) {
  const sprint = await db.sprints.get(sprintId);
  if (!sprint?.projectIds.includes(projectId)) throw new RequestError(400, 'O projeto deve estar vinculado à sprint.');
  if (!await db.teams.get(teamId)) throw new RequestError(400, 'A equipe selecionada não existe.');
  const existing = await db.tasks.bySprint(sprintId);
  const tasksByNumber = new Map<number, TaskRecord[]>();
  for (const task of existing) {
    const matches = tasksByNumber.get(task.taskNumber) ?? [];
    matches.push(task);
    tasksByNumber.set(task.taskNumber, matches);
  }
  const peopleByEmail = new Map((await db.staff.byEmails([...new Set(tasks.map(task => task.email))])).map(person => [person.email, person]));
  const participantsByStaff = new Map((await db.participants.bySprint(sprintId)).map(participant => [participant.staffId, participant]));
  const missingStaff = new Set<string>();
  const snapshots: unknown[] = [];
  const checked = [];
  for (const item of tasks) {
    const matches = tasksByNumber.get(item.taskNumber) ?? [];
    if (matches.length > 1) throw new RequestError(409, `A sprint possui mais de uma tarefa com ID ${item.taskNumber}; resolva a duplicidade antes de importar.`);
    const person = peopleByEmail.get(item.email) ?? null;
    if (!person) missingStaff.add(item.email);
    const participant = person ? participantsByStaff.get(person.id) ?? null : null;
    snapshots.push({ task: matches[0] ?? null, person, participant });
    checked.push({ ...item, existingId: matches[0]?.id ?? null });
  }
  const updated = checked.filter(item => item.existingId !== null).length;
  return {
    checked, peopleByEmail, participantsByStaff, tasksByNumber,
    fingerprint: createHash('sha256').update(JSON.stringify({ sprintId, projectId, teamId, tasks, snapshots })).digest('hex'),
    summary: { created: checked.length - updated, updated, createdStaff: missingStaff.size, pendingEstimates: checked.filter(item => item.plannedMinutes === null).length },
  };
}

export async function devOpsRoute({ req, res, url, storage }: RouteContext) {
  if (req.method !== 'POST') return respond(res, 405, { error: 'Método não permitido.' });
  const input = objectInput(await readInput(req, 4 * 1024 * 1024 + 65536));
  const sprintId = text(input.sprintId, 'a sprint');
  const projectId = text(input.projectId, 'o projeto');
  const teamId = text(input.teamId, 'a equipe');
  const file = text(input.file, 'o arquivo');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file)) throw new RequestError(400, 'Arquivo inválido.');
  const bytes = Buffer.from(file, 'base64');
  if (bytes.length > 3 * 1024 * 1024) throw new RequestError(413, 'O arquivo deve ter no máximo 3 MB.');
  const tasks = await parseDevOpsWorkbook(bytes);
  if (url.pathname.endsWith('/preview')) {
    const { checked, summary, fingerprint } = await storage.read(db => inspectImport(db, sprintId, projectId, teamId, tasks));
    return respond(res, 200, { summary, fingerprint, tasks: checked.map(({ existingId, ...item }) => ({ ...item, action: existingId ? 'update' : 'create' })) });
  }
  const summary = await storage.transaction(async db => {
    const inspection = await inspectImport(db, sprintId, projectId, teamId, tasks);
    if (input.fingerprint !== undefined && input.fingerprint !== inspection.fingerprint) throw new RequestError(409, 'Os dados mudaram após a pré-visualização. Volte e pré-visualize novamente antes de importar.');
    for (const item of inspection.checked) {
      let person = inspection.peopleByEmail.get(item.email);
      if (!person) {
        person = { id: randomUUID(), name: item.name, email: item.email, teamId };
        await db.staff.save(person);
        inspection.peopleByEmail.set(item.email, person);
      }
      let participant = inspection.participantsByStaff.get(person.id);
      if (!participant) {
        participant = { id: randomUUID(), sprintId, staffId: person.id, totalMinutes: 0 };
        await db.participants.save(participant);
        inspection.participantsByStaff.set(person.id, participant);
      }
      const old = item.existingId ? inspection.tasksByNumber.get(item.taskNumber)?.[0] ?? null : null;
      if (item.existingId && !old) throw new Error('Tarefa da pré-visualização não encontrada.');
      await db.tasks.save({
        id: old?.id ?? randomUUID(), participantId: participant.id, projectId,
        featureId: old?.projectId === projectId ? old.featureId : null,
        taskNumber: item.taskNumber, title: item.title, plannedMinutes: item.plannedMinutes,
        devOpsUrl: item.devOpsUrl ?? old?.devOpsUrl ?? null,
        actualMinutes: old?.actualMinutes ?? null, lessons: old?.lessons ?? '',
        challenges: old?.challenges ?? '', reviewNotes: old?.reviewNotes ?? '',
        deployDate: old?.deployDate ?? null,
      });
    }
    return inspection.summary;
  });
  return respond(res, 200, summary);
}
