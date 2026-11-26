export type ProjectRecord = { id: string; data: string; updatedAt: Date; hasPendingChanges?: boolean };
export type ProjectApproverRecord = { id: string; name: string; email: string };
export type ProjectProposalRecord = {
  id: string; projectId: string; data: string; changes: string; authorId: string; authorName: string;
  updatedById: string; updatedByName: string; createdAt: Date; updatedAt: Date;
};
export type ProjectRevisionRecord = {
  id: string; projectId: string; snapshot: string; changes: string; status: 'APPROVED' | 'REJECTED' | 'CANCELLED';
  authorId: string; authorName: string; reviewerId: string | null; reviewerName: string | null;
  createdAt: Date; reviewedAt: Date | null;
};
export type ProjectProposalInput = Omit<ProjectProposalRecord, 'authorName' | 'updatedByName'>;
export type ProjectRevisionInput = Omit<ProjectRevisionRecord, 'authorName' | 'reviewerName'>;
export type SprintRecord = { id: string; name: string; objective: string; startDate: string; endDate: string; projectIds: string[] };
export type TeamRecord = { id: string; name: string; description: string };
export type StaffRecord = { id: string; name: string; email: string | null; teamId: string };
export type ParticipantRecord = { id: string; sprintId: string; staffId: string; totalMinutes: number };
export type TaskRecord = {
  id: string; participantId: string; projectId: string; featureId: string | null;
  taskNumber: number; title: string; devOpsUrl: string | null; plannedMinutes: number | null;
  actualMinutes: number | null; lessons: string; challenges: string; reviewNotes: string;
  deployDate: string | null;
};

export interface ProjectRepository {
  list(): Promise<ProjectRecord[]>;
  get(id: string): Promise<ProjectRecord | null>;
  save(project: ProjectRecord): Promise<void>;
  delete(id: string): Promise<void>;
  listApprovers(): Promise<ProjectApproverRecord[]>;
  listApproverIds(projectId: string): Promise<string[]>;
  setApprovers(projectId: string, approverIds: string[]): Promise<void>;
  isApprover(projectId: string, userId: string): Promise<boolean>;
  getProposal(projectId: string): Promise<ProjectProposalRecord | null>;
  getProposalById(id: string): Promise<ProjectProposalRecord | null>;
  saveProposal(proposal: ProjectProposalInput): Promise<void>;
  deleteProposal(projectId: string): Promise<void>;
  saveRevision(revision: ProjectRevisionInput): Promise<void>;
  listHistory(projectId: string): Promise<ProjectRevisionRecord[]>;
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
