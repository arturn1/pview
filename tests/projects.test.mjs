import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('projetos independentes preservam dados ao criar, importar, trocar e recarregar', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
  const previousFetch = globalThis.fetch;
  const database = new Map();
  let failWrites = false;
  let failDeletes = false;
  let writesInProgress = 0;
  let maxConcurrentWrites = 0;

  globalThis.fetch = async (url, options = {}) => {
    const parsed = new URL(url, 'http://localhost');
    if (parsed.pathname === '/api/projects') {
      return Response.json([...database.values()].map(({ id, name }) => ({ id, name })));
    }
    if (options.method === 'DELETE') {
      if (failDeletes) return new Response('error', { status: 500 });
      database.delete(parsed.searchParams.get('id'));
      return Response.json({ success: true });
    }
    if (options.method === 'POST') {
      writesInProgress++;
      maxConcurrentWrites = Math.max(maxConcurrentWrites, writesInProgress);
      await new Promise(resolve => setTimeout(resolve, 5));
      writesInProgress--;
      if (failWrites) return Response.json({ error: 'Remova os vínculos das tarefas antes de excluir funcionalidades do projeto.' }, { status: 409 });
      const project = JSON.parse(options.body);
      database.set(project.id, project);
      return Response.json({ success: true });
    }
    const project = database.get(parsed.searchParams.get('id'));
    return project ? Response.json(project) : new Response('not found', { status: 404 });
  };

  try {
    const { useProjectStore } = await server.ssrLoadModule('/src/store/useProjectStore.ts');
    const state = () => useProjectStore.getState();
    await state().loadFromRepository();
    const pilot = structuredClone(state().project);
    await state().createProject('Projeto vazio', '');
    const emptyId = state().project.id;
    assert.notEqual(emptyId, pilot.id);
    await state().loadFromRepository();
    assert.equal(state().project.id, emptyId);
    assert.equal(state().project.nodes.length, 0);

    const json = await readFile(new URL('../docs/flowdoc.json', import.meta.url), 'utf8');
    await state().importProjectJson(json);
    const firstCopy = structuredClone(state().project);
    assert.notEqual(firstCopy.id, pilot.id);
    assert.ok(firstCopy.nodes.every(node => node.projectId === firstCopy.id));
    assert.ok(firstCopy.connections.every(connection => connection.projectId === firstCopy.id));
    await state().importProjectJson(json);
    assert.notEqual(state().project.id, firstCopy.id);
    assert.equal(state().projects.length, 4);
    assert.deepEqual(database.get(pilot.id), pilot);
    await state().openPilotProject();
    assert.deepEqual(state().project, pilot);

    const feature = pilot.nodes.find(node => node.type === 'feature' && node.parentId);
    const featureId = feature.id;
    failWrites = true;
    await assert.rejects(state().deleteNode(featureId), /Remova os vínculos/);
    await assert.rejects(state().deleteNode(feature.parentId), /Remova os vínculos/);
    assert.deepEqual(state().project, pilot);
    assert.deepEqual(database.get(pilot.id), pilot);
    failWrites = false;
    await state().deleteNode(featureId);
    assert.ok(!state().project.nodes.some(node => node.id === featureId));
    assert.deepEqual(database.get(pilot.id), state().project);

    state().addModuleNode('Primeiro', '');
    state().addModuleNode('Segundo', '');
    await state().saveToRepository();
    assert.equal(maxConcurrentWrites, 1);
    assert.ok(database.get(pilot.id).nodes.some(node => node.title === 'Módulo: Segundo'));

    failWrites = true;
    state().addModuleNode('Não salvo', '');
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(state().saveError);
    await assert.rejects(state().selectProject(emptyId));
    await assert.rejects(state().selectProject(emptyId));
    await assert.rejects(state().updateProject(emptyId, 'Editado', ''));
    await assert.rejects(state().deleteProject(emptyId));
    assert.equal(state().project.id, pilot.id);
    failWrites = false;
    await state().saveToRepository();
    await state().selectProject(emptyId);
    assert.ok(database.get(pilot.id).nodes.some(node => node.title === 'Módulo: Não salvo'));
    await assert.rejects(state().importProjectJson('{"id":"x","nodes":[],"connections":[]}'));
    assert.equal(state().project.id, emptyId);

    const { ProjectList } = await server.ssrLoadModule('/src/components/projects/ProjectList.tsx');
    const { AppDialogProvider } = await server.ssrLoadModule('/src/components/common/AppDialog.tsx');
    // Zustand uses the initial snapshot during server rendering.
    const snapshot = useProjectStore.getInitialState();
    Object.assign(snapshot, { projects: state().projects, isLoading: false, loadError: null });
    const renderList = () => renderToStaticMarkup(createElement(
      AppDialogProvider, null,
      createElement(ProjectList, { user: { name: 'Pessoa de teste', email: 'pessoa@example.test', role: 'ADM' }, onLogout() {}, onOpenProject() {}, onOpenSprints() {}, onManageUsers() {} }),
    ));
    const list = renderList();
    assert.match(list, /Pessoa de teste/);
    assert.match(list, /pessoa@example\.test/);
    assert.doesNotMatch(list, /Dados recebidos do IS4/);
    assert.match(list, /Projeto vazio/);
    assert.match(list, /Abrir projeto/);
    assert.match(list, /Editar Projeto vazio/);
    assert.match(list, /Excluir Projeto vazio/);
    assert.match(list, /Todas as sprints/);
    assert.match(list, /Sprints de Projeto vazio/);
    const readOnlyList = renderToStaticMarkup(createElement(
      AppDialogProvider, null,
      createElement(ProjectList, { user: { name: 'Pessoa de teste', email: 'pessoa@example.test', role: 'USER' }, onLogout() {}, onOpenProject() {}, onOpenSprints() {}, onManageUsers() {} }),
    ));
    assert.doesNotMatch(readOnlyList, /Novo Projeto|Editar Projeto vazio|Excluir Projeto vazio|>Usuários</);
    snapshot.loadError = 'Falha de teste';
    const errorPage = renderList();
    assert.match(errorPage, /Não foi possível carregar os projetos/);
    assert.match(errorPage, /Tentar novamente/);

    await state().updateProject(firstCopy.id, ' Projeto renomeado ', ' Nova descrição ');
    assert.equal(state().project.id, emptyId);
    assert.equal(database.get(firstCopy.id).name, 'Projeto renomeado');
    assert.equal(database.get(firstCopy.id).description, 'Nova descrição');
    assert.deepEqual(database.get(firstCopy.id).nodes, firstCopy.nodes);
    assert.equal(state().projects.find(project => project.id === firstCopy.id).name, 'Projeto renomeado');
    await state().updateProject(emptyId, 'Atualizado', 'Descrição atualizada');
    assert.equal(state().project.name, 'Atualizado');
    await assert.rejects(state().updateProject(emptyId, '  ', ''));
    failWrites = true;
    await assert.rejects(state().updateProject(emptyId, 'Não salvo', ''));
    assert.equal(state().project.name, 'Atualizado');
    failWrites = false;

    failDeletes = true;
    await assert.rejects(state().deleteProject(firstCopy.id));
    assert.ok(state().projects.some(project => project.id === firstCopy.id));
    assert.ok(database.has(firstCopy.id));
    failDeletes = false;
    await state().deleteProject(firstCopy.id);
    assert.equal(state().project.id, emptyId);
    assert.equal(database.has(firstCopy.id), false);
    await state().deleteProject(emptyId);
    assert.notEqual(state().project.id, emptyId);
    for (const project of [...state().projects]) await state().deleteProject(project.id);
    assert.equal(state().projects.length, 0);
    assert.equal(database.size, 0);
    state().setCanWrite(false);
    await state().loadFromRepository();
    assert.equal(state().projects.length, 0);
    assert.equal(database.size, 0);
    state().setCanWrite(true);
    await state().loadFromRepository();
    assert.equal(state().projects.length, 1);
    assert.equal(state().project.id, pilot.id);
  } finally {
    globalThis.fetch = previousFetch;
    await server.close();
  }
});

test('operações de projeto aguardam gravações e a fila se recupera após falha', async () => {
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const previousFetch = globalThis.fetch;
  const calls = [];
  let releaseFirst;
  const firstWrite = new Promise(resolve => { releaseFirst = resolve; });
  let writes = 0;
  globalThis.fetch = async (url, options = {}) => {
    calls.push([url, options.method ?? 'GET']);
    if (options.method === 'POST') {
      writes++;
      if (writes === 1) {
        await firstWrite;
        return Response.json({ error: 'Falha de gravação' }, { status: 409 });
      }
      return Response.json({ success: true });
    }
    if (url === '/api/project?id=missing') return new Response(null, { status: 404 });
    if (url === '/api/projects') return Response.json([{ id: 'p1', name: 'Projeto' }]);
    if (options.method === 'DELETE') return Response.json({ success: true });
    return Response.json({ id: 'p1', name: 'Projeto' });
  };
  try {
    const api = await server.ssrLoadModule('/src/api/projects.ts');
    const first = api.saveProject({ id: 'p1', name: 'Primeiro' });
    const failed = assert.rejects(first, /Falha de gravação/);
    const second = api.saveProject({ id: 'p1', name: 'Segundo' });
    const read = api.getProject('p1');
    const list = api.listProjects();
    const remove = api.deleteProject('p1');
    assert.equal(await api.getProject('missing'), null);
    assert.deepEqual(calls, [['/api/project', 'POST'], ['/api/project?id=missing', 'GET']]);
    releaseFirst();
    await failed;
    const [, project, projects] = await Promise.all([second, read, list, remove]);
    assert.equal(writes, 2);
    assert.equal(project.id, 'p1');
    assert.equal(projects[0].id, 'p1');
    assert.equal(calls[2][1], 'POST');
  } finally {
    releaseFirst();
    globalThis.fetch = previousFetch;
    await server.close();
  }
});

test('filtro de módulos no canvas é vertical e rolável', async () => {
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { CanvasToolbar } = await server.ssrLoadModule('/src/components/canvas/CanvasToolbar.tsx');
    const { AppDialogProvider } = await server.ssrLoadModule('/src/components/common/AppDialog.tsx');
    const { useProjectStore } = await server.ssrLoadModule('/src/store/useProjectStore.ts');
    useProjectStore.getInitialState().mode = 'editor';
    const html = renderToStaticMarkup(createElement(AppDialogProvider, null, createElement(CanvasToolbar, {
      onBackToProjects() {}, onOpenSprints() {}, onLogout() {}, selectedModuleId: null,
      onFilterModule() {}, onSearchSelectNode() {}, onFitView() {},
    })));
    const filter = html.match(/<div role="group" aria-label="Filtrar por módulo"[^>]*>[\s\S]*?<\/div>/)?.[0];
    assert.ok(filter);
    assert.match(filter, /flex-col/);
    assert.match(filter, /overflow-y-auto/);
    assert.match(filter, /justify-self-start/);
    assert.match(filter, />Todos<\/button>/);
    assert.match(filter, /folder-kanban/);
    assert.doesNotMatch(html, /Novo Projeto/);
    assert.match(html, /Novo Módulo/);
    assert.match(html, /Nova Funcionalidade/);
  } finally {
    await server.close();
  }
});

test('modo somente leitura expande funcionalidades sem gravar o projeto', async () => {
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const previousFetch = globalThis.fetch;
  let writes = 0;
  try {
    globalThis.fetch = async () => { writes++; return Response.json({ success: true }); };
    const { useProjectStore } = await server.ssrLoadModule('/src/store/useProjectStore.ts');
    const state = useProjectStore.getState();
    const feature = state.project.nodes.find(node => node.type === 'feature');
    state.setCanWrite(false);
    state.updateNodeExpanded(feature.id, !feature.expanded);
    assert.equal(useProjectStore.getState().project.nodes.find(node => node.id === feature.id).expanded, !feature.expanded);
    assert.equal(writes, 0);
  } finally {
    globalThis.fetch = previousFetch;
    await server.close();
  }
});
