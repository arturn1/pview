import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('cartão e ação organizar abrem a sprint sem interferir nas demais ações', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { SprintCard } = await vite.ssrLoadModule('/src/components/sprints/SprintList.tsx');
    const sprint = { id: 's1', name: 'Sprint de teste', objective: 'Objetivo', startDate: '2026-01-01', endDate: '2026-01-14', projectIds: ['p1'] };
    const calls = [];
    const props = { sprint, projects: [{ id: 'p1', name: 'Projeto' }], disabled: false, onOpen: item => calls.push(['open', item.id]), onEdit: item => calls.push(['edit', item.id]), onRemove: item => calls.push(['remove', item.id]) };
    const tree = SprintCard(props);
    function buttons(node) {
      if (Array.isArray(node)) return node.flatMap(buttons);
      if (!node || typeof node !== 'object' || !node.props) return [];
      return [...(node.type === 'button' ? [node] : []), ...buttons(node.props.children)];
    }
    const actions = buttons(tree);
    for (const label of ['Abrir planejamento de Sprint de teste', 'Organizar Sprint de teste', 'Editar Sprint de teste', 'Excluir Sprint de teste']) {
      const button = actions.find(item => item.props['aria-label'] === label);
      assert.ok(button);
      button.props.onClick();
    }
    assert.deepEqual(calls, [['open', 's1'], ['open', 's1'], ['edit', 's1'], ['remove', 's1']]);
    assert.match(renderToStaticMarkup(createElement(SprintCard, props)), /Abrir planejamento de Sprint de teste/);
  } finally {
    await vite.close();
  }
});

test('cartão oferece consulta de tarefas e esconde ações de organização para USER', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { SprintCard } = await vite.ssrLoadModule('/src/components/sprints/SprintList.tsx');
    const sprint = { id: 's1', name: 'Sprint de teste', objective: 'Objetivo', startDate: '2026-01-01', endDate: '2026-01-14', projectIds: ['p1'] };
    const html = renderToStaticMarkup(createElement(SprintCard, {
      sprint, projects: [{ id: 'p1', name: 'Projeto' }], disabled: false, viewOnly: true, canManage: false,
      onOpen() {}, onEdit() {}, onRemove() {},
    }));
    assert.match(html, /Ver tarefas de Sprint de teste/);
    assert.doesNotMatch(html, /Organizar|Editar|Excluir/);
  } finally {
    await vite.close();
  }
});

test('simulação de papel é identificada como visual e só aparece com o contexto de ADM', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { RoleSimulationContext, WorkspaceHeader } = await vite.ssrLoadModule('/src/components/common/WorkspaceHeader.tsx');
    const user = { name: 'Pessoa de teste', email: 'pessoa@example.test', role: 'USER' };
    const simulated = renderToStaticMarkup(createElement(
      RoleSimulationContext.Provider,
      { value: { onRoleChange() {} } },
      createElement(WorkspaceHeader, { user, onLogout() {} }),
    ));
    assert.match(simulated, /Simular papel \(somente interface\)/);
    assert.match(simulated, /API continua usando as permissões reais de ADM/);
    const regular = renderToStaticMarkup(createElement(WorkspaceHeader, { user, onLogout() {} }));
    assert.doesNotMatch(regular, /Simular papel/);
  } finally {
    await vite.close();
  }
});

test('formulário apresenta os dados e projetos de uma sprint existente', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { SprintForm } = await vite.ssrLoadModule('/src/components/sprints/SprintForm.tsx');
    const sprint = { id: 's1', name: 'Sprint de teste', objective: 'Objetivo de teste', startDate: '2026-02-01', endDate: '2026-02-14', projectIds: ['p1'] };
    const html = renderToStaticMarkup(createElement(SprintForm, { sprint, projects: [{ id: 'p1', name: 'Projeto A' }, { id: 'p2', name: 'Projeto B' }], onClose() {}, onSaved() {} }));
    assert.match(html, /Editar sprint/);
    assert.match(html, /Sprint de teste/);
    assert.match(html, /Objetivo de teste/);
    assert.match(html, /Projeto A/);
    assert.match(html, /Projeto B/);
    assert.equal((html.match(/checked=""/g) || []).length, 1);
  } finally {
    await vite.close();
  }
});

test('cartão de participante mostra detalhes apenas quando expandido', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { ParticipantCard } = await vite.ssrLoadModule('/src/components/sprints/SprintPlan.tsx');
    const props = {
      participant: { id: 'p1', staffName: 'Pessoa', teamName: 'Equipe', totalMinutes: 60 },
      tasks: [
        { id: 't1', taskNumber: 1, title: 'Tarefa', projectId: 'p', featureId: null, devOpsUrl: 'https://example.test/work/1', plannedMinutes: 75, actualMinutes: null, lessons: '', challenges: '', reviewNotes: '' },
        { id: 't2', taskNumber: 2, title: 'Outra', projectId: 'p', featureId: null, devOpsUrl: null, plannedMinutes: null, actualMinutes: null, lessons: '', challenges: '', reviewNotes: '' },
      ], projectNames: new Map(), featureNames: new Map(), busy: false,
      onToggle() {}, onCapacity() {}, onRemove() {}, onTask() {}, onDeleteTask() {},
    };
    const closed = renderToStaticMarkup(createElement(ParticipantCard, { ...props, expanded: false }));
    assert.match(closed, /aria-expanded="false"/);
    assert.match(closed, /aria-controls="participant-details-p1"/);
    assert.match(closed, /id="participant-details-p1" hidden=""/);
    assert.match(closed, /Pessoa/);
    assert.match(closed, /Capacidade: 1:00 · Atribuído: 1:15 · Restante: -0:15 · 2 tarefas · 1 estimativa pendente/);
    const open = renderToStaticMarkup(createElement(ParticipantCard, { ...props, expanded: true }));
    assert.match(open, /aria-expanded="true"/);
    assert.match(open, /id="participant-details-p1">/);
    assert.match(open, /Atribuir tarefa/);
    assert.match(open, /Capacidade/);
    assert.match(open, /href="https:\/\/example\.test\/work\/1" target="_blank" rel="noopener noreferrer" aria-label="Abrir tarefa 1 no DevOps \(nova aba\)"/);
    assert.doesNotMatch(open, /Abrir tarefa 2 no DevOps/);
    const readOnly = renderToStaticMarkup(createElement(ParticipantCard, { ...props, expanded: true, canManage: false, canEditTasks: false }));
    assert.doesNotMatch(readOnly, /Atribuir tarefa|Remover participante|Editar tarefa|Excluir tarefa/);
    const ownTasks = renderToStaticMarkup(createElement(ParticipantCard, { ...props, expanded: true, canManage: false, canEditTasks: true }));
    assert.match(ownTasks, /Editar tarefa 1/);
    assert.doesNotMatch(ownTasks, /Atribuir tarefa|Remover participante|Excluir tarefa/);
  } finally {
    await vite.close();
  }
});
