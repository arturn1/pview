import assert from 'node:assert/strict';
import { test } from 'node:test';
import ExcelJS from 'exceljs';
import { createApiFixture } from './api-fixture.mjs';

async function workbook(rows, headers = ['Title', 'ID', 'Assigned To', 'Original Estimate']) {
  const file = new ExcelJS.Workbook();
  const sheet = file.addWorksheet('Tasks');
  sheet.addRow(headers);
  for (const [title, id, assigned, estimate, link] of rows) {
    sheet.addRow([title, link ? { text: String(id), hyperlink: link } : id, assigned, estimate]);
  }
  return Buffer.from(await file.xlsx.writeBuffer()).toString('base64');
}

test('API Prisma preserva os cenários de sprints, planejamento e importação', {
  skip: !process.env.FLOWDOC_TEST_DATABASE_URL && 'Use npm run test:postgres para criar um banco de teste.',
}, async t => {
  const { db, storage, users, login, request, close } = await createApiFixture();
  try {
    await users.seedAdministrator('domain-admin@example.test');
    const admin = await login('domain-admin@example.test', 'domain-admin');
    assert.equal(admin.status, 200);
    const api = (path, method, body) => request(admin.cookie, path, method, body);
    for (const id of ['sprints-p1', 'sprints-p2', 'plan-p1', 'plan-p2', 'plan-p3', 'import-p1', 'import-p2']) {
      assert.equal((await api('/api/project', 'POST', { id, name: id, nodes: id === 'plan-p1' || id === 'import-p1' ? [{ id: 'feature', type: 'feature' }, { id: 'module', type: 'module' }] : [] })).status, 200);
    }

    await t.test('encaminha rotas conhecidas e rejeita métodos não suportados', async () => {
      for (const path of [
        '/api/projects', '/api/project', '/api/sprints', '/api/teams', '/api/staff',
        '/api/sprint-plan', '/api/sprint-participants', '/api/sprint-tasks',
        '/api/sprint-import-devops', '/api/sprint-import-devops/preview',
      ]) assert.equal((await api(path, 'PATCH')).status, 405, path);
      assert.equal((await api('/api/inexistente')).status, 404);
    });

    await t.test('mantém transações compartilhadas entre repositórios', async () => {
      async function insert(session) {
        await session.projects.save({ id: 'tx-project', data: JSON.stringify({ id: 'tx-project', name: 'Transação' }), updatedAt: new Date() });
        await session.sprints.save({ id: 'tx-sprint', name: 'Transação', objective: 'Teste', startDate: '2026-01-01', endDate: '2026-01-14', projectIds: ['tx-project'] });
        await session.teams.save({ id: 'tx-team', name: 'Transação', description: '' });
        await session.staff.save({ id: 'tx-staff', name: 'Pessoa', email: null, teamId: 'tx-team' });
      }
      await assert.rejects(storage.transaction(async session => {
        await insert(session);
        throw new Error('rollback de teste');
      }), /rollback de teste/);
      assert.equal(await db.project.count({ where: { id: 'tx-project' } }), 0);
      assert.equal(await db.sprint.count({ where: { id: 'tx-sprint' } }), 0);
      assert.equal(await db.team.count({ where: { id: 'tx-team' } }), 0);
      assert.equal(await db.staff.count({ where: { id: 'tx-staff' } }), 0);
      await storage.transaction(insert);
      const saved = await storage.read(session => session.sprints.get('tx-sprint'));
      assert.deepEqual(saved.projectIds, ['tx-project']);
      assert.equal((await db.staff.findUnique({ where: { id: 'tx-staff' } })).teamId, 'tx-team');
    });

    await t.test('valida, filtra e pagina sprints com ordenação estável', async () => {
      const input = { name: 'Sprint inicial', objective: 'Entregar', startDate: '2026-02-01', endDate: '2026-02-14', projectIds: ['sprints-p1', 'sprints-p2'] };
      const created = await api('/api/sprints', 'POST', input);
      assert.equal(created.status, 201);
      const id = created.body.sprint.id;
      assert.deepEqual(created.body.sprint.projectIds, ['sprints-p1', 'sprints-p2']);
      for (const invalid of [
        { ...input, name: ' ' }, { ...input, objective: '' },
        { ...input, startDate: '2026-02-30' }, { ...input, endDate: '2026-01-31' },
        { ...input, projectIds: [] }, { ...input, projectIds: ['sprints-p1', 'sprints-p1'] },
        { ...input, projectIds: ['missing'] },
      ]) assert.equal((await api('/api/sprints', 'POST', invalid)).status, 400);
      assert.equal((await api('/api/sprints?id=missing', 'PUT', input)).status, 404);
      const updated = await api(`/api/sprints?id=${id}`, 'PUT', { ...input, name: 'Atualizada', projectIds: ['sprints-p2'] });
      assert.equal(updated.body.sprint.name, 'Atualizada');
      assert.equal((await api('/api/sprints?projectId=sprints-p1')).body.total, 0);
      assert.equal((await api('/api/sprints?projectId=sprints-p2')).body.total, 1);
      assert.equal((await api(`/api/sprints?id=${id}`, 'DELETE')).status, 200);
      assert.equal((await api(`/api/sprints?id=${id}`, 'DELETE')).status, 404);
      assert.equal((await api('/api/sprints', 'PATCH')).status, 405);

      for (let i = 0; i < 26; i++) {
        const name = `Sprint ${String(i).padStart(2, '0')}`;
        assert.equal((await api('/api/sprints', 'POST', { ...input, name, projectIds: [i % 2 === 0 ? 'sprints-p1' : 'sprints-p2'] })).status, 201);
      }
      assert.equal((await api('/api/sprints', 'POST', { ...input, name: 'ENTREGA ÁGIL 100%', startDate: '2026-03-01', endDate: '2026-03-14' })).status, 201);
      const first = (await api('/api/sprints?projectId=sprints-p1&page=1&pageSize=5')).body;
      const second = (await api('/api/sprints?projectId=sprints-p1&page=2&pageSize=5')).body;
      assert.equal(first.total, 14);
      assert.equal(first.sprints[0].name, 'ENTREGA ÁGIL 100%');
      assert.deepEqual(first.sprints[0].projectIds, ['sprints-p1', 'sprints-p2']);
      assert.equal(new Set([...first.sprints, ...second.sprints].map(item => item.id)).size, 10);
      assert.equal((await api('/api/sprints?projectId=sprints-p1&page=99&pageSize=5')).body.page, 3);
      assert.equal((await api(`/api/sprints?projectId=sprints-p2&search=${encodeURIComponent('ágil 100%')}`)).body.total, 1);
      assert.equal((await api('/api/sprints?projectId=sprints-p1&search=_')).body.total, 0);
      for (const query of ['?page=0', '?page=-1', '?page=1.5', '?pageSize=101', '?pageSize=0']) assert.equal((await api(`/api/sprints${query}`)).status, 400);
      assert.equal((await api('/api/project?id=sprints-p2', 'DELETE')).status, 200);
      assert.equal((await api('/api/sprints?projectId=sprints-p2')).body.total, 0);
      const remaining = (await api(`/api/sprints?projectId=sprints-p1&search=${encodeURIComponent('ágil')}`)).body.sprints;
      assert.deepEqual(remaining[0].projectIds, ['sprints-p1']);
    });

    await t.test('preserva vínculos, capacidade e retrospectiva no planejamento', async () => {
      const sprintData = { name: 'Planejamento', objective: 'Entregar', startDate: '2026-03-01', endDate: '2026-03-14', projectIds: ['plan-p1', 'plan-p2'] };
      const sprintId = (await api('/api/sprints', 'POST', sprintData)).body.sprint.id;
      const teamId = (await api('/api/teams', 'POST', { name: 'Planejamento', description: '' })).body.id;
      const personId = (await api('/api/staff', 'POST', { name: 'Pessoa', teamId })).body.id;
      assert.equal((await api(`/api/teams?id=${teamId}`, 'PUT', { name: 'Equipe atualizada', description: 'Descrição' })).status, 200);
      assert.equal((await api(`/api/staff?id=${personId}`, 'PUT', { name: 'Pessoa atualizada', teamId })).status, 200);
      assert.ok((await api('/api/teams')).body.teams.some(team => team.id === teamId && team.name === 'Equipe atualizada'));
      assert.ok((await api('/api/staff')).body.staff.some(person => person.id === personId && person.name === 'Pessoa atualizada'));
      const participant = { sprintId, staffId: personId, totalMinutes: 90 };
      const participantId = (await api('/api/sprint-participants', 'POST', participant)).body.id;
      assert.equal((await api('/api/sprint-participants', 'POST', participant)).status, 409);
      assert.equal((await api(`/api/teams?id=${teamId}`, 'DELETE')).status, 409);
      const input = { participantId, projectId: 'plan-p1', featureId: 'feature', taskNumber: 42, title: 'Tarefa', plannedMinutes: 75, actualMinutes: 95, lessons: 'Aprendizado', challenges: 'Desafio', reviewNotes: 'Observação' };
      const created = await api('/api/sprint-tasks', 'POST', input);
      assert.equal(created.status, 201);
      const taskId = created.body.task.id;
      assert.deepEqual(created.body.task, { id: taskId, ...input, devOpsUrl: null });
      for (const invalid of [
        { ...input, plannedMinutes: 0.5 }, { ...input, projectId: 'plan-p3', featureId: null },
        { ...input, projectId: 'plan-p2', featureId: 'feature' }, { ...input, featureId: 'module' },
        { ...input, taskNumber: -1 }, { ...input, actualMinutes: -1 },
      ]) assert.ok((await api('/api/sprint-tasks', 'POST', invalid)).status >= 400);
      assert.equal((await api(`/api/sprint-participants?id=${participantId}`, 'PUT', { totalMinutes: 74 })).status, 200);
      const second = await api('/api/sprint-tasks', 'POST', { ...input, featureId: null, plannedMinutes: 15, taskNumber: 43 });
      assert.equal(second.status, 201);
      assert.equal((await api(`/api/sprint-tasks?id=${second.body.task.id}`, 'DELETE')).status, 200);
      const changed = { ...input, plannedMinutes: 90, actualMinutes: 0, lessons: 'Nova lição', challenges: 'Novo desafio', reviewNotes: 'Nova observação' };
      assert.equal((await api(`/api/sprint-tasks?id=${taskId}`, 'PUT', changed)).status, 200);
      const plan = (await api(`/api/sprint-plan?sprintId=${sprintId}`)).body;
      assert.equal(plan.participants[0].totalMinutes, 74);
      assert.deepEqual(plan.tasks[0], { id: taskId, ...changed, devOpsUrl: null });
      for (const path of [`/api/sprint-participants?id=${participantId}`, `/api/staff?id=${personId}`, `/api/sprints?id=${sprintId}`, '/api/project?id=plan-p1']) {
        assert.equal((await api(path, 'DELETE')).status, 409);
      }
      assert.equal((await api(`/api/sprints?id=${sprintId}`, 'PUT', { ...sprintData, projectIds: ['plan-p2'] })).status, 409);
      assert.equal((await api('/api/project', 'POST', { id: 'plan-p1', name: 'plan-p1', nodes: [] })).status, 409);
      assert.equal((await api(`/api/sprint-tasks?id=${taskId}`, 'DELETE')).status, 200);
      assert.equal((await api('/api/project', 'POST', { id: 'plan-p1', name: 'plan-p1', nodes: [] })).status, 200);
      assert.equal((await api(`/api/sprints?id=${sprintId}`, 'PUT', { ...sprintData, projectIds: ['plan-p2'] })).status, 200);
      for (const path of [`/api/sprint-participants?id=${participantId}`, `/api/staff?id=${personId}`, `/api/teams?id=${teamId}`, `/api/sprints?id=${sprintId}`, '/api/project?id=plan-p1']) {
        assert.equal((await api(path, 'DELETE')).status, 200);
      }
    });

    await t.test('pré-visualiza e reimporta tarefas preservando dados e atomicidade', async () => {
      const sprint = (await api('/api/sprints', 'POST', { name: 'Importação', objective: 'Entregar', startDate: '2026-01-01', endDate: '2026-01-14', projectIds: ['import-p1', 'import-p2'] })).body.sprint;
      const teamId = (await api('/api/teams', 'POST', { name: 'Importação', description: '' })).body.id;
      const staffId = (await api('/api/staff', 'POST', { name: 'Existente', email: 'import-known@example.test', teamId })).body.id;
      const base = { sprintId: sprint.id, projectId: 'import-p1', teamId };
      const first = await workbook([
        ['Primeira', 101, 'Pessoa <IMPORT-KNOWN@example.test>', 1.5, 'https://example.test/work/101'],
        ['Segunda', 102, 'Outra <import-other@example.test>', null, null],
        ['Zero', 103, 'Outra <import-other@example.test>', 0, null],
      ]);
      const preview = await api('/api/sprint-import-devops/preview', 'POST', { ...base, file: first });
      assert.equal(preview.status, 200);
      assert.deepEqual(preview.body.summary, { created: 3, updated: 0, createdStaff: 1, pendingEstimates: 1 });
      assert.equal(preview.body.tasks[0].action, 'create');
      assert.equal(preview.body.tasks[0].plannedMinutes, 90);
      assert.equal(preview.body.tasks[0].devOpsUrl, 'https://example.test/work/101');
      assert.equal(preview.body.tasks[1].plannedMinutes, null);
      assert.equal((await api(`/api/sprint-plan?sprintId=${sprint.id}`)).body.tasks.length, 0);
      assert.equal(await db.participant.count({ where: { sprintId: sprint.id } }), 0);
      assert.equal(await db.staff.count({ where: { email: 'import-other@example.test' } }), 0);
      assert.equal((await api(`/api/staff?id=${staffId}`, 'PUT', { name: 'Outro nome', email: 'import-known@example.test', teamId })).status, 200);
      assert.equal((await api('/api/sprint-import-devops', 'POST', { ...base, file: first, fingerprint: preview.body.fingerprint })).status, 409);
      assert.equal((await api(`/api/sprint-plan?sprintId=${sprint.id}`)).body.tasks.length, 0);
      assert.equal(await db.staff.count({ where: { email: 'import-other@example.test' } }), 0);
      const refreshed = (await api('/api/sprint-import-devops/preview', 'POST', { ...base, file: first })).body;
      assert.deepEqual((await api('/api/sprint-import-devops', 'POST', { ...base, file: first, fingerprint: refreshed.fingerprint })).body, refreshed.summary);
      const plan = (await api(`/api/sprint-plan?sprintId=${sprint.id}`)).body;
      assert.equal(plan.participants.length, 2);
      assert.equal(plan.participants.find(p => p.staffId === staffId).totalMinutes, 0);
      assert.equal(plan.tasks.find(task => task.taskNumber === 103).plannedMinutes, 0);
      const original = plan.tasks.find(task => task.taskNumber === 101);
      assert.equal((await api(`/api/sprint-tasks?id=${original.id}`, 'PUT', { ...original, featureId: 'feature', actualMinutes: 45, lessons: 'Lição', challenges: 'Desafio', reviewNotes: 'Nota' })).status, 200);
      const changed = await workbook([
        ['Título atualizado', 101, 'Outra <import-other@example.test>', 2, 'https://example.test/work/new'],
        ['Segunda', 102, 'Outra <IMPORT-OTHER@example.test>', null, null],
      ]);
      const changedPreview = (await api('/api/sprint-import-devops/preview', 'POST', { ...base, file: changed })).body;
      assert.deepEqual(changedPreview.summary, { created: 0, updated: 2, createdStaff: 0, pendingEstimates: 1 });
      assert.equal(changedPreview.tasks[0].action, 'update');
      assert.deepEqual((await api('/api/sprint-import-devops', 'POST', { ...base, file: changed, fingerprint: changedPreview.fingerprint })).body, changedPreview.summary);
      const updated = (await api(`/api/sprint-plan?sprintId=${sprint.id}`)).body.tasks.find(task => task.id === original.id);
      assert.notEqual(updated.participantId, original.participantId);
      assert.equal(updated.title, 'Título atualizado');
      assert.equal(updated.devOpsUrl, 'https://example.test/work/new');
      assert.equal(updated.plannedMinutes, 120);
      assert.equal(updated.actualMinutes, 45);
      assert.equal(updated.lessons, 'Lição');
      assert.equal(updated.challenges, 'Desafio');
      assert.equal(updated.reviewNotes, 'Nota');
      assert.equal(updated.featureId, 'feature');
      const noLink = await workbook([['Sem link', 101, 'Outra <import-other@example.test>', 2, null]]);
      assert.equal((await api('/api/sprint-import-devops', 'POST', { ...base, file: noLink })).status, 200);
      assert.equal((await api(`/api/sprint-plan?sprintId=${sprint.id}`)).body.tasks.find(task => task.id === original.id).devOpsUrl, 'https://example.test/work/new');
      assert.equal((await api('/api/sprint-import-devops', 'POST', { ...base, projectId: 'import-p2', file: changed })).status, 200);
      assert.equal((await api(`/api/sprint-plan?sprintId=${sprint.id}`)).body.tasks.find(task => task.id === original.id).featureId, null);
      for (const rows of [
        [['Sem e-mail válido', 105, 'Pessoa <bad-email>', 1]],
        [['Precisão inválida', 105, 'Pessoa <x@example.test>', 0.123]],
        [['Hiperlink inválido', 105, 'Pessoa <x@example.test>', 1, 'javascript:alert(1)']],
        [['Duplicada', 105, 'Pessoa <x@example.test>', 1], ['Duplicada', 105, 'Pessoa <x@example.test>', 1]],
      ]) {
        const response = await api('/api/sprint-import-devops', 'POST', { ...base, file: await workbook(rows) });
        assert.equal(response.status, 400);
        assert.match(response.body.error, /Linha/);
      }
      assert.equal((await api('/api/sprint-import-devops', 'POST', { ...base, projectId: 'missing', file: first })).status, 400);
      assert.equal((await api('/api/sprint-import-devops', 'POST', { ...base, file: await workbook([], ['Title', 'ID']) })).status, 400);
      for (const path of ['/api/sprint-import-devops', '/api/sprint-import-devops/preview']) {
        assert.equal((await api(path, 'POST', { ...base, file: Buffer.from('not xlsx').toString('base64') })).status, 400);
      }
      await db.task.create({ data: { id: 'import-duplicate', participantId: updated.participantId, projectId: 'import-p1', taskNumber: 101n, title: '', plannedMinutes: 1n, lessons: '', challenges: '', reviewNotes: '' } });
      const atomic = await workbook([['Nova', 999, 'Nova <import-new@example.test>', 1], ['Duplicada', 101, 'Outra <import-other@example.test>', 1]]);
      for (const path of ['/api/sprint-import-devops/preview', '/api/sprint-import-devops']) {
        assert.equal((await api(path, 'POST', { ...base, file: atomic })).status, 409);
      }
      assert.equal(await db.staff.count({ where: { email: 'import-new@example.test' } }), 0);
      assert.equal(await db.task.count({ where: { participant: { sprintId: sprint.id }, taskNumber: 999n } }), 0);
    });
  } finally {
    await close();
  }
});
