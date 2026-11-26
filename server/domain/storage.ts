export type ProjectRecord = { id: string; data: string; updatedAt: Date };
export type SprintRecord = { id: string; name: string; objective: string; startDate: string; endDate: string; projectIds: string[] };
export type TeamRecord = { id: string; name: string; description: string };
export type StaffRecord = { id: string; name: string; email: string | null; teamId: string };
export type ParticipantRecord = { id: string; sprintId: string; staffId: string; totalMinutes: number };
export type TaskRecord = {
  id: string; participantId: string; projectId: string; featureId: string | null;
  taskNumber: number; title: string; devOpsUrl: string | null; plannedMinutes: number | null;
  actualMinutes: number | null; lessons: string; challenges: string; reviewNotes: string;
};

export interface ProjectRepository {
  list(): Promise<ProjectRecord[]>;
  get(id: string): Promise<ProjectRecord | null>;
  save(project: ProjectRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface SprintRepository {
  get(id: string): Promise<SprintRecord | null>;
  page(projectId: string | null, search: string, page: number, pageSize: number): Promise<{ sprints: SprintRecord[]; total: number; page: number; pageSize: number }>;
  save(sprint: SprintRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TeamRepository {
  list(): Promise<TeamRecord[]>;
  get(id: string): Promise<TeamRecord | null>;
  save(team: TeamRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface StaffRepository {
  list(): Promise<StaffRecord[]>;
  get(id: string): Promise<StaffRecord | null>;
  byEmail(email: string): Promise<StaffRecord | null>;
  byEmails(emails: string[]): Promise<StaffRecord[]>;
  save(staff: StaffRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ParticipantRepository {
  bySprint(sprintId: string): Promise<ParticipantRecord[]>;
  byStaff(staffId: string): Promise<ParticipantRecord[]>;
  get(id: string): Promise<ParticipantRecord | null>;
  bySprintAndStaff(sprintId: string, staffId: string): Promise<ParticipantRecord | null>;
  save(participant: ParticipantRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TaskRepository {
  bySprint(sprintId: string): Promise<TaskRecord[]>;
  byParticipant(participantId: string): Promise<TaskRecord[]>;
  byProject(projectId: string): Promise<TaskRecord[]>;
  get(id: string): Promise<TaskRecord | null>;
  save(task: TaskRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface StorageSession {
  projects: ProjectRepository;
  sprints: SprintRepository;
  teams: TeamRepository;
  staff: StaffRepository;
  participants: ParticipantRepository;
  tasks: TaskRepository;
}

export interface Storage {
  read<T>(action: (session: StorageSession) => Promise<T>): Promise<T>;
  transaction<T>(action: (session: StorageSession) => Promise<T>): Promise<T>;
}
