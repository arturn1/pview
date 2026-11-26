import type { Project } from '../types';
import { request } from './request';

export interface ProjectSummary {
  id: string;
  name: string;
  hasPendingChanges?: boolean;
}

export interface ProjectApprover {
  id: string;
  name: string;
  email: string;
}

export interface ProjectApproverOptions {
  approvers: ProjectApprover[];
  selectedIds: string[];
}

export interface ProjectChangeItem {
  itemType: 'project' | 'module' | 'feature' | 'rule' | 'calculation' | 'input' | 'output' | 'note' | 'connection';
  itemId: string;
  parentId: string | null;
  label: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  before: unknown;
  after: unknown;
}

export interface ProjectHistoryEntry {
  id: string;
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED';
  authorName: string;
  reviewerName: string | null;
  createdAt: string;
  reviewedAt: string | null;
  changes: ProjectChangeItem[];
}

export interface ProjectHistory {
  canApprove: boolean;
  pending: {
    id: string;
    authorName: string;
    updatedByName: string;
    createdAt: string;
    updatedAt: string;
    changes: ProjectChangeItem[];
  } | null;
  history: ProjectHistoryEntry[];
}

const endpoint = '/api/project';
const writes = new Map<string, Promise<{ pending: boolean }>>();

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

export function getApprovedProject(id: string): Promise<Project> {
  return request(`/api/project-approved?id=${encodeURIComponent(id)}`);
}

export function getProjectApproverOptions(projectId?: string): Promise<ProjectApproverOptions> {
  const query = projectId ? `?id=${encodeURIComponent(projectId)}` : '';
  return request(`/api/project-approvers${query}`);
}

export function saveProject(project: Project, approverIds?: string[]): Promise<{ pending: boolean }> {
  const write = async (): Promise<{ pending: boolean }> => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approverIds === undefined ? project : { ...project, approverIds }),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'Falha ao salvar projeto'));
    const body: unknown = await res.json();
    if (!body || typeof body !== 'object' || !('pending' in body) || typeof body.pending !== 'boolean') {
      throw new Error('A resposta ao salvar o projeto é inválida.');
    }
    return { pending: body.pending };
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

export function getProjectHistory(id: string): Promise<ProjectHistory> {
  return request(`/api/project-history?id=${encodeURIComponent(id)}`);
}

export function reviewProjectChange(id: string, action: 'approve' | 'reject'): Promise<{ status: 'APPROVED' | 'REJECTED' }> {
  return request(`/api/project-review?id=${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
}
