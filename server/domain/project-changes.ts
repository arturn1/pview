import { isDeepStrictEqual } from 'node:util';

export type ChangeAction = 'CREATED' | 'UPDATED' | 'DELETED';
export type ChangeItemType = 'project' | 'module' | 'feature' | 'rule' | 'calculation' | 'input' | 'output' | 'note' | 'connection';
export type ProjectChangeItem = {
  itemType: ChangeItemType;
  itemId: string;
  parentId: string | null;
  label: string;
  action: ChangeAction;
  before: unknown;
  after: unknown;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) as JsonRecord[] : [];
}

function semanticProject(project: JsonRecord) {
  return {
    name: project.name,
    description: project.description,
    version: project.version,
    tags: project.tags,
    isPublic: project.isPublic,
  };
}

function semanticNode(node: JsonRecord) {
  const content = record(node.content);
  return {
    type: node.type,
    title: node.title,
    parentId: node.parentId,
    order: node.order,
    tags: node.tags,
    description: content.description,
  };
}

function change(
  itemType: ChangeItemType,
  itemId: string,
  parentId: string | null,
  label: unknown,
  before: unknown,
  after: unknown,
): ProjectChangeItem {
  return {
    itemType,
    itemId,
    parentId,
    label: typeof label === 'string' && label.trim() ? label : itemType,
    action: before === null ? 'CREATED' : after === null ? 'DELETED' : 'UPDATED',
    before,
    after,
  };
}

function compareIdentifiedItems(
  itemType: ChangeItemType,
  parentId: string | null,
  beforeItems: unknown,
  afterItems: unknown,
  labelFor: (item: JsonRecord) => unknown,
  semanticFor: (item: JsonRecord) => unknown = item => item,
): ProjectChangeItem[] {
  const before = new Map(array(beforeItems).filter(item => typeof item.id === 'string').map(item => [item.id as string, item]));
  const after = new Map(array(afterItems).filter(item => typeof item.id === 'string').map(item => [item.id as string, item]));
  const changes: ProjectChangeItem[] = [];

  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const previous = before.get(id);
    const next = after.get(id);
    const previousValue = previous ? semanticFor(previous) : null;
    const nextValue = next ? semanticFor(next) : null;
    if (isDeepStrictEqual(previousValue, nextValue)) continue;
    changes.push(change(itemType, id, parentId, labelFor(next || previous!), previousValue, nextValue));
  }
  return changes;
}

function semanticConnection(connection: JsonRecord) {
  return {
    fromId: connection.fromId,
    toId: connection.toId,
    type: connection.type,
    label: connection.label,
    description: connection.description,
    payload: connection.payload,
  };
}

export function diffProjectChanges(previousValue: unknown, nextValue: unknown): ProjectChangeItem[] {
  const previous = record(previousValue);
  const next = record(nextValue);
  const changes: ProjectChangeItem[] = [];
  const previousProject = semanticProject(previous);
  const nextProject = semanticProject(next);
  if (!isDeepStrictEqual(previousProject, nextProject)) {
    changes.push(change('project', String(next.id || previous.id || 'project'), null, next.name || previous.name, previousProject, nextProject));
  }

  changes.push(...compareIdentifiedItems('connection', null, previous.connections, next.connections, item => item.label || `${item.fromId} → ${item.toId}`, semanticConnection));

  const previousNodes = new Map(array(previous.nodes).filter(item => typeof item.id === 'string').map(item => [item.id as string, item]));
  const nextNodes = new Map(array(next.nodes).filter(item => typeof item.id === 'string').map(item => [item.id as string, item]));
  for (const id of new Set([...previousNodes.keys(), ...nextNodes.keys()])) {
    const before = previousNodes.get(id);
    const after = nextNodes.get(id);
    const beforeNode = before ? semanticNode(before) : null;
    const afterNode = after ? semanticNode(after) : null;
    if (!isDeepStrictEqual(beforeNode, afterNode)) {
      const nodeType = (after || before)?.type;
      const type = nodeType === 'module' ? 'module' : nodeType === 'rule' ? 'rule' : 'feature';
      changes.push(change(type, id, (after || before)?.parentId as string | null ?? null, (after || before)?.title, beforeNode, afterNode));
    }

    const beforeContent = record(before?.content);
    const afterContent = record(after?.content);
    const parentId = id;
    const parentTitle = (after || before)?.title;
    const nestedChanges = [
      ...compareIdentifiedItems('rule', parentId, beforeContent.rules, afterContent.rules, item => item.condition || item.consequence),
      ...compareIdentifiedItems('calculation', parentId, beforeContent.calculations, afterContent.calculations, item => item.name),
      ...compareIdentifiedItems('input', parentId, beforeContent.inputs, afterContent.inputs, item => item.name),
      ...compareIdentifiedItems('output', parentId, beforeContent.outputs, afterContent.outputs, item => item.name),
      ...compareIdentifiedItems('note', parentId, beforeContent.notes, afterContent.notes, item => item.text),
    ];
    changes.push(...nestedChanges.map(item => ({ ...item, label: `${String(parentTitle || 'Item')}: ${item.label}` })));
  }
  return changes;
}

const visualNodeKeys = ['icon', 'color', 'position', 'size', 'expanded', 'visible', 'zIndex', 'locked'];

function mergeVisualKeys(target: JsonRecord, source: JsonRecord, keys: string[]) {
  const result = { ...target };
  for (const key of keys) {
    if (Object.hasOwn(source, key)) result[key] = source[key];
    else delete result[key];
  }
  return result;
}

export function mergeProjectPresentation(publishedValue: unknown, incomingValue: unknown): unknown {
  const published = record(publishedValue);
  const incoming = record(incomingValue);
  const incomingNodes = new Map(array(incoming.nodes).filter(item => typeof item.id === 'string').map(item => [item.id as string, item]));
  const incomingConnections = new Map(array(incoming.connections).filter(item => typeof item.id === 'string').map(item => [item.id as string, item]));
  const merged: JsonRecord = {
    ...published,
    updatedAt: incoming.updatedAt ?? published.updatedAt,
    canvasSettings: incoming.canvasSettings ?? published.canvasSettings,
    nodes: array(published.nodes).map(node => {
      const source = incomingNodes.get(node.id as string);
      return source ? mergeVisualKeys(node, source, visualNodeKeys) : node;
    }),
    connections: array(published.connections).map(connection => {
      const source = incomingConnections.get(connection.id as string);
      return source ? mergeVisualKeys(connection, source, ['sourceHandle', 'targetHandle', 'style']) : connection;
    }),
  };
  if (Object.hasOwn(incoming, 'thumbnail')) merged.thumbnail = incoming.thumbnail;
  return merged;
}
