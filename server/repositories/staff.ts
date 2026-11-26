import type { StaffRecord, StaffRepository } from '../domain/storage';
import type { Client } from './client';

export class PrismaStaffRepository implements StaffRepository {
  constructor(private readonly db: Client) {}

  list() { return this.db.staff.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }] }); }
  get(id: string) { return this.db.staff.findUnique({ where: { id } }); }
  byEmail(email: string) { return this.db.staff.findUnique({ where: { email } }); }
  byEmails(emails: string[]) { return this.db.staff.findMany({ where: { email: { in: emails } } }); }
  async save(staff: StaffRecord) { await this.db.staff.upsert({ where: { id: staff.id }, create: staff, update: staff }); }
  async delete(id: string) { await this.db.staff.delete({ where: { id } }); }
}
