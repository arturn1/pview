import type { Prisma } from '@prisma/client';
import type { ProjectRecord, ProjectRepository } from '../domain/storage';
import type { Client } from './client';

export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly db: Client) {}

  async list() {
    const records = await this.db.project.findMany({ orderBy: { updatedAt: 'desc' } });
    return records.map(record => ({ ...record, data: JSON.stringify(record.data) }));
  }

  async get(id: string) {
    const record = await this.db.project.findUnique({ where: { id } });
    return record && { ...record, data: JSON.stringify(record.data) };
  }

  async save(project: ProjectRecord) {
    const data: Prisma.InputJsonValue = JSON.parse(project.data);
    await this.db.project.upsert({ where: { id: project.id }, create: { id: project.id, data, updatedAt: project.updatedAt }, update: { data, updatedAt: project.updatedAt } });
  }

  async delete(id: string) { await this.db.project.delete({ where: { id } }); }
}
