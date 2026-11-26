import { Project } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function validateProject(project: unknown): asserts project is Project {
  if (!isRecord(project) || typeof project.id !== 'string' || !project.id ||
      typeof project.name !== 'string' || typeof project.description !== 'string' ||
      typeof project.version !== 'string' || typeof project.createdAt !== 'string' ||
      typeof project.updatedAt !== 'string' || typeof project.isPublic !== 'boolean' ||
      !isStringArray(project.tags) || !isRecord(project.canvasSettings) ||
      !Array.isArray(project.nodes) || !Array.isArray(project.connections)) {
    throw new Error('O arquivo não contém os dados obrigatórios de um projeto FlowDoc.');
  }

  const settings = project.canvasSettings;
  if (typeof settings.defaultZoom !== 'number' || typeof settings.backgroundColor !== 'string' ||
      typeof settings.gridVisible !== 'boolean' || typeof settings.snapToGrid !== 'boolean' ||
      typeof settings.miniMapVisible !== 'boolean') {
    throw new Error('As configurações do canvas são inválidas.');
  }

  const ids = new Set<string>();
  const nodeTypes = new Map<string, string>();
  for (const node of project.nodes) {
    if (!isRecord(node) || typeof node.id !== 'string' || !node.id || ids.has(node.id) ||
        typeof node.projectId !== 'string' || (node.parentId !== null && typeof node.parentId !== 'string') ||
        !['module', 'feature', 'rule'].includes(String(node.type)) ||
        typeof node.title !== 'string' || !isStringArray(node.tags) || !isRecord(node.position) ||
        typeof node.position.x !== 'number' || typeof node.position.y !== 'number' || !isRecord(node.content)) {
      throw new Error('Um nó está incompleto ou possui ID duplicado.');
    }
    ids.add(node.id);
    nodeTypes.set(node.id, String(node.type));
    const content = node.content;
    if (typeof content.description !== 'string' || !Array.isArray(content.rules) ||
        !Array.isArray(content.calculations) || !Array.isArray(content.inputs) || !Array.isArray(content.outputs)) {
      throw new Error(`O conteúdo do nó "${node.title}" está incompleto.`);
    }
    for (const rule of content.rules) {
      if (!isRecord(rule) || typeof rule.id !== 'string' || typeof rule.condition !== 'string' ||
          typeof rule.consequence !== 'string' || !['critical', 'warning', 'info'].includes(String(rule.severity))) {
        throw new Error(`Uma regra de "${node.title}" é inválida.`);
      }
    }
    for (const calc of content.calculations) {
      if (!isRecord(calc) || typeof calc.id !== 'string' || typeof calc.name !== 'string' ||
          typeof calc.formula !== 'string' || !Array.isArray(calc.variables) ||
          !calc.variables.every((v: unknown) => isRecord(v) && typeof v.symbol === 'string' && typeof v.name === 'string')) {
        throw new Error(`Um cálculo de "${node.title}" é inválido.`);
      }
    }
  }
  for (const node of project.nodes) {
    if (node.parentId !== null && nodeTypes.get(node.parentId) !== 'module') {
      throw new Error(`O módulo pai do nó "${node.title}" não existe.`);
    }
  }
  const connectionIds = new Set<string>();
  for (const connection of project.connections) {
    if (!isRecord(connection) || typeof connection.id !== 'string' || !connection.id ||
        connectionIds.has(connection.id) || typeof connection.projectId !== 'string' ||
        typeof connection.fromId !== 'string' || typeof connection.toId !== 'string' ||
        nodeTypes.get(connection.fromId) !== 'feature' || nodeTypes.get(connection.toId) !== 'feature' ||
        !['sync', 'async', 'batch', 'optional'].includes(String(connection.type))) {
      throw new Error('Uma conexão é inválida ou referencia funcionalidades inexistentes.');
    }
    connectionIds.add(connection.id);
  }

}

export function parseImportedProject(json: string): Project {
  const project: unknown = JSON.parse(json);
  validateProject(project);
  return project;
}

export function copyImportedProject(project: Project): Project {
  const id = crypto.randomUUID();
  return {
    ...project,
    id,
    updatedAt: new Date().toISOString(),
    nodes: project.nodes.map(node => ({ ...node, projectId: id })),
    connections: project.connections.map(connection => ({ ...connection, projectId: id })),
  };
}
