import type { Participant } from '@prisma/client';
import type { ParticipantRecord, ParticipantRepository } from '../domain/storage';
import { safeNumber, type Client } from './client';

function participantRecord(value: Participant): ParticipantRecord {
  return { ...value, totalMinutes: safeNumber(value.totalMinutes) };
}

export class PrismaParticipantRepository implements ParticipantRepository {
  constructor(private readonly db: Client) {}

  async bySprint(sprintId: string) { return (await this.db.participant.findMany({ where: { sprintId }, orderBy: [{ staff: { name: 'asc' } }, { id: 'asc' }] })).map(participantRecord); }
  async byStaff(staffId: string) { return (await this.db.participant.findMany({ where: { staffId } })).map(participantRecord); }
  async get(id: string) { const result = await this.db.participant.findUnique({ where: { id } }); return result && participantRecord(result); }
  async bySprintAndStaff(sprintId: string, staffId: string) { const result = await this.db.participant.findUnique({ where: { sprintId_staffId: { sprintId, staffId } } }); return result && participantRecord(result); }
  async save(participant: ParticipantRecord) {
    const data = { ...participant, totalMinutes: BigInt(participant.totalMinutes) };
    await this.db.participant.upsert({ where: { id: participant.id }, create: data, update: data });
  }
  async delete(id: string) { await this.db.participant.delete({ where: { id } }); }
}
