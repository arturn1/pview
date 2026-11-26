import { Prisma, PrismaClient } from '@prisma/client';
import { RequestError } from '../http/helpers';
import type { Storage, StorageSession } from '../domain/storage';
import type { Client } from './client';
import { PrismaProjectRepository } from './projects';
import { PrismaSprintRepository } from './sprints';
import { PrismaTeamRepository } from './teams';
import { PrismaStaffRepository } from './staff';
import { PrismaParticipantRepository } from './participants';
import { PrismaTaskRepository } from './tasks';
import { PrismaDeploySubscriptionRepository } from './deploy-subscriptions';

function session(db: Client): StorageSession {
  return {
    projects: new PrismaProjectRepository(db),
    sprints: new PrismaSprintRepository(db),
    teams: new PrismaTeamRepository(db),
    staff: new PrismaStaffRepository(db),
    participants: new PrismaParticipantRepository(db),
    tasks: new PrismaTaskRepository(db),
    deploySubscriptions: new PrismaDeploySubscriptionRepository(db),
  };
}

export class PrismaStorage implements Storage {
  constructor(private readonly db: PrismaClient) {}

  read<T>(action: (session: StorageSession) => Promise<T>) {
    return action(session(this.db));
  }

  async transaction<T>(action: (session: StorageSession) => Promise<T>) {
    try {
      return await this.db.$transaction(tx => action(session(tx)), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new RequestError(409, 'Os dados foram alterados simultaneamente. Tente novamente.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new RequestError(409, 'Já existe um registro com esses dados.');
      }
      throw error;
    }
  }
}
