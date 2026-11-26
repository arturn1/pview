import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'vite';

test('visão de sprint para USER não retorna dados que identifiquem colaboradores', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { planningRoute } = await vite.ssrLoadModule('/server/http/routes/planning.ts');
    let responseBody = '';
    const response = {
      statusCode: 200,
      setHeader() {},
      end(value) { responseBody = value; },
    };
    const privateTask = {
      id: 'task-id', participantId: 'participant-id', projectId: 'project-id', featureId: 'feature-id',
      taskNumber: 42, title: 'Tarefa', devOpsUrl: 'https://devops.example.test/42',
      plannedMinutes: 60, actualMinutes: 30, lessons: 'Privado', challenges: 'Privado', reviewNotes: 'Privado',
    };
    await planningRoute({
      req: { method: 'GET' },
      res: response,
      url: new URL('http://localhost/api/sprint-plan?sprintId=sprint-id'),
      storage: {
        read: action => action({
          sprints: { get: async () => ({ id: 'sprint-id' }) },
          tasks: { bySprint: async () => [privateTask] },
        }),
      },
      userFor: () => ({ id: 'user-id', name: 'Viewer', email: 'viewer@example.test', role: 'USER' }),
    });

    assert.deepEqual(JSON.parse(responseBody), {
      tasks: [{
        taskNumber: 42, title: 'Tarefa', projectId: 'project-id', featureId: 'feature-id',
        plannedMinutes: 60, actualMinutes: 30,
      }],
    });
  } finally {
    await vite.close();
  }
});
