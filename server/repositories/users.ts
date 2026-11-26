import { Prisma, PrismaClient } from '@prisma/client';
import { RequestError } from '../http/helpers';
import { normalizeUserEmail, type Identity, type Role, type UserRepository } from '../domain/users';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async seedAdministrator(email: string) {
    const normalized = normalizeUserEmail(email);
    await this.db.user.upsert({
      where: { email: normalized },
      create: { email: normalized, name: normalized, role: 'ADM' },
      update: {},
    });
  }

  async authenticate(identity: Identity) {
    const email = normalizeUserEmail(identity.email);
    return this.db.$transaction(async tx => {
      const existingIdentity = await tx.identity.findUnique({
        where: { issuer_subject: { issuer: identity.issuer, subject: identity.subject } },
        include: { user: true },
      });
      if (existingIdentity) {
        if (existingIdentity.user.email !== email) throw new RequestError(403, 'O e-mail da identidade mudou. Contate um administrador.');
        return tx.user.update({ where: { id: existingIdentity.userId }, data: { name: identity.name || email } });
      }
      const existingUser = await tx.user.findUnique({ where: { email }, include: { identities: true } });
      if (existingUser?.identities.length) throw new RequestError(403, 'O e-mail já está vinculado a outra identidade.');
      const user = existingUser
        ? await tx.user.update({ where: { id: existingUser.id }, data: { name: identity.name || email } })
        : await tx.user.create({ data: { email, name: identity.name || email, role: 'USER' } });
      await tx.identity.create({ data: { issuer: identity.issuer, subject: identity.subject, userId: user.id } });
      return user;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  get(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }

  list() {
    return this.db.user.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }] });
  }

  async setRole(id: string, role: Role) {
    return this.db.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) throw new RequestError(404, 'Usuário não encontrado.');
      if (user.role === 'ADM' && role !== 'ADM' && await tx.user.count({ where: { role: 'ADM' } }) <= 1) {
        throw new RequestError(409, 'É necessário manter ao menos um administrador.');
      }
      if (user.role === 'APPROVER' && role !== 'APPROVER') await tx.projectApprover.deleteMany({ where: { userId: id } });
      return tx.user.update({ where: { id }, data: { role } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
