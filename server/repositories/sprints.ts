import type { Prisma } from '@prisma/client';
import type { SprintRecord, SprintRepository } from '../domain/storage';
import type { Client } from './client';

type SprintWithProjects = { id: string; name: string; objective: string; startDate: string; endDate: string; projects: { projectId: string }[] };

function sprintRecord(sprint: SprintWithProjects): SprintRecord {
  return { id: sprint.id, name: sprint.name, objective: sprint.objective, startDate: sprint.startDate, endDate: sprint.endDate, projectIds: sprint.projects.map(link => link.projectId).sort() };
}

export class PrismaSprintRepository implements SprintRepository {
  constructor(private readonly db: Client) {}

  async get(id: string) {
    const result = await this.db.sprint.findUnique({ where: { id }, include: { projects: true } });
    return result && sprintRecord(result);
  }

  async page(projectId: string | null, search: string, page: number, pageSize: number) {
    const where: Prisma.SprintWhereInput = {
      ...(projectId ? { projects: { some: { projectId } } } : {}),
      ...(search ? { nameFold: { contains: search.replace(/[\\%_]/g, '\\$&') } } : {}),
    };
    const total = await this.db.sprint.count({ where });
    const actualPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    const rows = await this.db.sprint.findMany({
      where, skip: (actualPage - 1) * pageSize, take: pageSize,
      orderBy: [{ startDate: 'desc' }, { name: 'asc' }, { id: 'asc' }],
      include: { projects: true },
    });
    return { sprints: rows.map(sprintRecord), total, page: actualPage, pageSize };
  }

  async save(sprint: SprintRecord) {
    const { projectIds, id, ...fields } = sprint;
    const data = { ...fields, nameFold: fields.name.toLocaleLowerCase() };
    await this.db.sprint.upsert({ where: { id }, create: { id, ...data }, update: data });
    await this.db.sprintProject.deleteMany({ where: { sprintId: id } });
    await this.db.sprintProject.createMany({ data: projectIds.map(projectId => ({ sprintId: id, projectId })) });
  }

  async delete(id: string) { await this.db.sprint.delete({ where: { id } }); }
}
