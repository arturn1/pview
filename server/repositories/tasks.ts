import type { Task } from '@prisma/client';
import type { TaskRecord, TaskRepository } from '../domain/storage';
import { safeNumber, type Client } from './client';

function taskRecord(value: Task): TaskRecord {
  return {
    ...value, taskNumber: safeNumber(value.taskNumber),
    plannedMinutes: value.plannedMinutes === null ? null : safeNumber(value.plannedMinutes),
    actualMinutes: value.actualMinutes === null ? null : safeNumber(value.actualMinutes),
  };
}

export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly db: Client) {}

  async bySprint(sprintId: string) { return (await this.db.task.findMany({ where: { participant: { sprintId } }, orderBy: [{ taskNumber: 'asc' }, { id: 'asc' }] })).map(taskRecord); }
  async byParticipant(participantId: string) { return (await this.db.task.findMany({ where: { participantId } })).map(taskRecord); }
  async byProject(projectId: string) { return (await this.db.task.findMany({ where: { projectId } })).map(taskRecord); }
  async get(id: string) { const result = await this.db.task.findUnique({ where: { id } }); return result && taskRecord(result); }
  async save(task: TaskRecord) {
    const data = { ...task, taskNumber: BigInt(task.taskNumber), plannedMinutes: task.plannedMinutes === null ? null : BigInt(task.plannedMinutes), actualMinutes: task.actualMinutes === null ? null : BigInt(task.actualMinutes) };
    await this.db.task.upsert({ where: { id: task.id }, create: data, update: data });
  }
  async delete(id: string) { await this.db.task.delete({ where: { id } }); }
}
