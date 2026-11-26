import type { Project } from '../types';

export interface ProjectSummary {
  id: string;
  name: string;
}

const endpoint = '/api/project';
const writes = new Map<string, Promise<void>>();

async function errorMessage(res: Response, prefix: string): Promise<string> {
  const body: unknown = await res.json().catch(() => null);
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error;
  return `${prefix}: ${res.status}`;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  await Promise.all(writes.values());
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error(`Falha ao listar projetos: ${res.status}`);
  return res.json();
}

export async function getProject(id: string): Promise<Project | null> {
  await writes.get(id);
  const res = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Falha ao carregar projeto: ${res.status}`);
  }
  return res.json();
}

export function saveProject(project: Project): Promise<void> {
  const write = async () => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'Falha ao salvar projeto'));
  };
  const previous = writes.get(project.id);
  const pending = previous ? previous.then(write, write) : write();
  writes.set(project.id, pending);
  const clear = () => {
    if (writes.get(project.id) === pending) writes.delete(project.id);
  };
  pending.then(clear, clear);
  return pending;
}

export async function deleteProject(id: string): Promise<void> {
  await writes.get(id);
  const res = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Falha ao excluir projeto'));
}
