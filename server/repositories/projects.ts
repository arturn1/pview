import type { Prisma } from '@prisma/client';
import { RequestError } from '../http/helpers';
import type { ProjectApproverRecord, ProjectProposalInput, ProjectProposalRecord, ProjectRecord, ProjectRepository, ProjectRevisionInput, ProjectRevisionRecord } from '../domain/storage';
import type { Client } from './client';

type ProposalWithAuthors = Prisma.ProjectProposalGetPayload<{
  include: { author: { select: { name: true } }; updatedBy: { select: { name: true } } };
}>;

export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly db: Client) {}

  async list() {
    const records = await this.db.project.findMany({ orderBy: { updatedAt: 'desc' }, include: { proposal: { select: { id: true } } } });
    return records.map(({ proposal, ...record }) => ({ ...record, data: JSON.stringify(record.data), hasPendingChanges: Boolean(proposal) }));
  }

  async get(id: string) {
    const record = await this.db.project.findUnique({ where: { id } });
    return record && { ...record, data: JSON.stringify(record.data) };
  }

  async save(project: ProjectRecord) {
    const data: Prisma.InputJsonValue = JSON.parse(project.data);
    await this.db.project.upsert({ where: { id: project.id }, create: { id: project.id, data, updatedAt: project.updatedAt }, update: { data, updatedAt: project.updatedAt } });
  }

  listApprovers(): Promise<ProjectApproverRecord[]> {
    return this.db.user.findMany({
      where: { role: 'APPROVER' },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });
  }

  async listApproverIds(projectId: string) {
    const assignments = await this.db.projectApprover.findMany({ where: { projectId }, select: { userId: true } });
    return assignments.map(assignment => assignment.userId);
  }

  async setApprovers(projectId: string, approverIds: string[]) {
    const ids = [...new Set(approverIds)];
    const validApprovers = await this.db.user.findMany({
      where: { id: { in: ids }, role: 'APPROVER' },
      select: { id: true },
    });
    if (validApprovers.length !== ids.length) throw new RequestError(400, 'Selecione apenas usuários com papel APPROVER.');

    await this.db.projectApprover.deleteMany({ where: { projectId } });
    if (ids.length) {
      await this.db.projectApprover.createMany({ data: ids.map(userId => ({ projectId, userId })) });
    }
  }

  async isApprover(projectId: string, userId: string) {
    return Boolean(await this.db.projectApprover.findUnique({ where: { projectId_userId: { projectId, userId } } }));
  }

  async getProposal(projectId: string) {
    const proposal = await this.db.projectProposal.findUnique({
      where: { projectId },
      include: { author: { select: { name: true } }, updatedBy: { select: { name: true } } },
    });
    return proposal ? this.toProposalRecord(proposal) : null;
  }

  async getProposalById(id: string) {
    const proposal = await this.db.projectProposal.findUnique({
      where: { id },
      include: { author: { select: { name: true } }, updatedBy: { select: { name: true } } },
    });
    return proposal ? this.toProposalRecord(proposal) : null;
  }

  async saveProposal(proposal: ProjectProposalInput) {
    const data: Prisma.InputJsonValue = JSON.parse(proposal.data);
    const changes: Prisma.InputJsonValue = JSON.parse(proposal.changes);
    await this.db.projectProposal.upsert({
      where: { projectId: proposal.projectId },
      create: {
        id: proposal.id, projectId: proposal.projectId, data, changes, authorId: proposal.authorId,
        updatedById: proposal.updatedById, createdAt: proposal.createdAt, updatedAt: proposal.updatedAt,
      },
      update: { data, changes, updatedById: proposal.updatedById, updatedAt: proposal.updatedAt },
    });
  }

  async deleteProposal(projectId: string) {
    await this.db.projectProposal.delete({ where: { projectId } });
  }

  async saveRevision(revision: ProjectRevisionInput) {
    const snapshot: Prisma.InputJsonValue = JSON.parse(revision.snapshot);
    const changes: Prisma.InputJsonValue = JSON.parse(revision.changes);
    await this.db.projectRevision.create({ data: { ...revision, snapshot, changes } });
  }

  async listHistory(projectId: string) {
    const revisions = await this.db.projectRevision.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true } }, reviewer: { select: { name: true } } },
    });
    return revisions.map(revision => ({
      ...revision,
      snapshot: JSON.stringify(revision.snapshot),
      changes: JSON.stringify(revision.changes),
      authorName: revision.author.name,
      reviewerName: revision.reviewer?.name ?? null,
    }));
  }

  async delete(id: string) { await this.db.project.delete({ where: { id } }); }

  private toProposalRecord(proposal: ProposalWithAuthors): ProjectProposalRecord {
    return {
      ...proposal,
      data: JSON.stringify(proposal.data),
      changes: JSON.stringify(proposal.changes),
      authorName: proposal.author.name,
      updatedByName: proposal.updatedBy.name,
    };
  }
}
