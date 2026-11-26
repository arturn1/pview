import { request } from './request';

export interface SprintInput {
  name: string;
  objective: string;
  startDate: string;
  endDate: string;
  projectIds: string[];
}

export interface Sprint extends SprintInput {
  id: string;
}

export interface SprintPage { sprints: Sprint[]; total: number; page: number; pageSize: number }

export async function listSprints(projectId: string | undefined, search: string, page: number): Promise<SprintPage> {
  const query = new URLSearchParams({ search, page: String(page) });
  if (projectId) query.set('projectId', projectId);
  return request(`/api/sprints?${query}`);
}

export async function saveSprint(input: SprintInput, id?: string): Promise<Sprint> {
  const query = id ? `?id=${encodeURIComponent(id)}` : '';
  const result = await request<{ sprint: Sprint }>(`/api/sprints${query}`, {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return result.sprint;
}

export async function deleteSprint(id: string): Promise<void> {
  await request(`/api/sprints?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}
