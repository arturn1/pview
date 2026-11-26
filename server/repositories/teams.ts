import type { TeamRecord, TeamRepository } from '../domain/storage';
import type { Client } from './client';

export class PrismaTeamRepository implements TeamRepository {
  constructor(private readonly db: Client) {}

  list() { return this.db.team.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }] }); }
  get(id: string) { return this.db.team.findUnique({ where: { id } }); }
  async save(team: TeamRecord) { await this.db.team.upsert({ where: { id: team.id }, create: team, update: team }); }
  async delete(id: string) { await this.db.team.delete({ where: { id } }); }
}
