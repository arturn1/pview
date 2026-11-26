import { request } from './request';

export interface Team { id: string; name: string; description: string }
export interface Staff { id: string; name: string; email: string | null; teamId: string }
export interface Participant { id: string; sprintId: string; staffId: string; staffName: string; teamName: string; totalMinutes: number }
export interface SprintTask {
  id: string; participantId: string; projectId: string; featureId: string | null;
  taskNumber: number; title: string; devOpsUrl: string | null; plannedMinutes: number | null; actualMinutes: number | null;
  lessons: string; challenges: string; reviewNotes: string; deployDate: string | null;
}
export interface SprintOverviewTask {
  taskNumber: number; title: string; projectId: string; featureId: string | null;
  plannedMinutes: number | null; actualMinutes: number | null; deployDate: string | null;
}
export interface SprintOverview { tasks: SprintOverviewTask[] }
export type TaskInput = Omit<SprintTask, 'id' | 'devOpsUrl' | 'deployDate'>;
export interface SprintPlan { participants: Participant[]; tasks: SprintTask[] }

function url(path: string, id?: string) {
  return id ? `${path}?id=${encodeURIComponent(id)}` : path;
}

function mutation(method: string, body?: object): RequestInit {
  return { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) };
}

export async function getTeams(): Promise<Team[]> { return (await request<{ teams: Team[] }>('/api/teams')).teams; }
export async function getStaff(): Promise<Staff[]> { return (await request<{ staff: Staff[] }>('/api/staff')).staff; }
export async function saveTeam(data: Omit<Team, 'id'>, id?: string) { await request(url('/api/teams', id), mutation(id ? 'PUT' : 'POST', data)); }
export async function saveStaff(data: Omit<Staff, 'id'>, id?: string) { await request(url('/api/staff', id), mutation(id ? 'PUT' : 'POST', data)); }
export async function deleteTeam(id: string) { await request(url('/api/teams', id), mutation('DELETE')); }
export async function deleteStaff(id: string) { await request(url('/api/staff', id), mutation('DELETE')); }
export async function getPlan(sprintId: string): Promise<SprintPlan> { return request(`/api/sprint-plan?sprintId=${encodeURIComponent(sprintId)}`); }
export async function getSprintOverview(sprintId: string): Promise<SprintOverview> { return request(`/api/sprint-plan?sprintId=${encodeURIComponent(sprintId)}`); }
export async function addParticipant(sprintId: string, staffId: string, totalMinutes: number) { await request('/api/sprint-participants', mutation('POST', { sprintId, staffId, totalMinutes })); }
export async function updateCapacity(id: string, totalMinutes: number) { await request(url('/api/sprint-participants', id), mutation('PUT', { totalMinutes })); }
export async function deleteParticipant(id: string) { await request(url('/api/sprint-participants', id), mutation('DELETE')); }
export async function saveTask(data: TaskInput, id?: string) { await request(url('/api/sprint-tasks', id), mutation(id ? 'PUT' : 'POST', data)); }
export async function setTasksDeployDate(taskIds: string[], deployDate: string | null) { await request('/api/sprint-task-deploy', mutation('PUT', { taskIds, deployDate })); }
export async function getDeploySubscription(sprintId: string): Promise<boolean> {
  return (await request<{ subscribed: boolean }>(`/api/sprint-deploy-subscription?sprintId=${encodeURIComponent(sprintId)}`)).subscribed;
}
export async function setDeploySubscription(sprintId: string, subscribed: boolean) { await request('/api/sprint-deploy-subscription', mutation('PUT', { sprintId, subscribed })); }
export async function deleteTask(id: string) { await request(url('/api/sprint-tasks', id), mutation('DELETE')); }
export interface ImportResult { created: number; updated: number; createdStaff: number; pendingEstimates: number }
export interface DevOpsPreview {
  summary: ImportResult;
  fingerprint: string;
  tasks: { taskNumber: number; title: string; email: string; name: string; plannedMinutes: number | null; devOpsUrl: string | null; action: 'create' | 'update' }[];
}
export async function previewDevOps(sprintId: string, projectId: string, teamId: string, file: string): Promise<DevOpsPreview> {
  return request('/api/sprint-import-devops/preview', mutation('POST', { sprintId, projectId, teamId, file }));
}
export async function importDevOps(sprintId: string, projectId: string, teamId: string, file: string, fingerprint: string): Promise<ImportResult> {
  return request('/api/sprint-import-devops', mutation('POST', { sprintId, projectId, teamId, file, fingerprint }));
}
