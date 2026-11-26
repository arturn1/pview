import type { DeploySubscriptionRepository } from '../domain/notifications';
import type { Client } from './client';

export class PrismaDeploySubscriptionRepository implements DeploySubscriptionRepository {
  constructor(private readonly db: Client) {}

  async isSubscribed(sprintId: string, userId: string) {
    return Boolean(await this.db.deploySubscription.findUnique({ where: { sprintId_userId: { sprintId, userId } } }));
  }

  async subscribe(sprintId: string, userId: string) {
    await this.db.deploySubscription.upsert({ where: { sprintId_userId: { sprintId, userId } }, create: { sprintId, userId }, update: {} });
  }

  async unsubscribe(sprintId: string, userId: string) {
    await this.db.deploySubscription.deleteMany({ where: { sprintId, userId } });
  }

  async subscribers(sprintId: string) {
    const rows = await this.db.deploySubscription.findMany({ where: { sprintId }, include: { user: true }, orderBy: { createdAt: 'asc' } });
    return rows.map(({ user }) => ({ id: user.id, name: user.name, email: user.email }));
  }
}
