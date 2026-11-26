import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('pré-visualização apresenta tarefas, pendências e confirmação', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { DevOpsPreview } = await vite.ssrLoadModule('/src/components/sprints/DevOpsImport.tsx');
    const preview = {
      fingerprint: 'test',
      summary: { created: 1, updated: 1, createdStaff: 1, pendingEstimates: 1 },
      tasks: [
        { taskNumber: 1, title: 'Tarefa nova', name: 'Pessoa', email: 'dev@example.test', plannedMinutes: 90, devOpsUrl: 'https://example.test/1', action: 'create' },
        { taskNumber: 2, title: 'Tarefa existente', name: 'Outra', email: 'other@example.test', plannedMinutes: null, devOpsUrl: null, action: 'update' },
      ],
    };
    const props = { preview, projectName: 'Projeto', teamName: 'Dev', fileName: 'dados.xlsx', saving: false, error: null, onBack() {}, onConfirm() {} };
    const html = renderToStaticMarkup(createElement(DevOpsPreview, props));
    for (const text of ['Pré-visualização', 'dados.xlsx', 'Tarefa nova', 'Tarefa existente', 'dev@example.test', '1:30', 'Pendente', 'Criar', 'Atualizar', 'Confirmar importação', 'Nenhuma alteração foi salva']) assert.ok(html.includes(text));
    assert.match(html, /href="https:\/\/example\.test\/1" target="_blank" rel="noopener noreferrer"/);
    assert.match(renderToStaticMarkup(createElement(DevOpsPreview, { ...props, error: 'Dados alterados' })), /role="alert"[^>]*>Dados alterados/);
  } finally {
    await vite.close();
  }
});
