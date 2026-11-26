import { randomUUID } from 'node:crypto';
import { RequestError, objectInput, readInput, respond, text } from '../helpers';
import type { RouteContext } from './common';
import { diffProjectChanges, mergeProjectPresentation } from '../../domain/project-changes';

function approverIdsInput(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some(id => typeof id !== 'string' || !id.trim())) {
    throw new RequestError(400, 'A lista de aprovadores do projeto é inválida.');
  }
  return [...new Set(value)];
}

export async function projectsRoute({ req, res, url, storage, userFor }: RouteContext) {
  const user = userFor(req);
  if (url.pathname === '/api/projects' && req.method === 'GET') {
    const projects = await storage.read(async db => (await db.projects.list()).map(row => {
      const value: unknown = JSON.parse(row.data);
      if (!value || typeof value !== 'object' || !('name' in value) || typeof value.name !== 'string') throw new Error(`Projeto ${row.id} sem nome válido.`);
      return { id: row.id, name: value.name, hasPendingChanges: row.hasPendingChanges ?? false };
    }));
    return respond(res, 200, projects);
  }
  if (url.pathname === '/api/project-approvers' && req.method === 'GET') {
    if (user?.role !== 'ADM' && user?.role !== 'DIGITAL') {
      return respond(res, 403, { error: 'Somente administradores e DIGITAL podem configurar aprovadores.' });
    }
    const projectId = url.searchParams.get('id');
    const result = await storage.read(async db => {
      if (projectId && !(await db.projects.get(projectId))) throw new RequestError(404, 'Projeto não encontrado.');
      return {
        approvers: await db.projects.listApprovers(),
        selectedIds: projectId ? await db.projects.listApproverIds(projectId) : [],
      };
    });
    return respond(res, 200, result);
  }
  if (url.pathname === '/api/project-approved' && req.method === 'GET') {
    const projectId = text(url.searchParams.get('id'), 'o projeto');
    const data = await storage.read(async db => {
      const project = await db.projects.get(projectId);
      if (!project) throw new RequestError(404, 'Projeto não encontrado.');
      return project.data;
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(data);
  }
  if (url.pathname === '/api/project-history' && req.method === 'GET') {
    if (user?.role === 'USER') return respond(res, 403, { error: 'Acesso ao histórico restrito a aprovadores.' });
    const projectId = text(url.searchParams.get('id'), 'o projeto');
    const history = await storage.read(async db => {
      await db.projects.get(projectId).then(project => {
        if (!project) throw new RequestError(404, 'Projeto não encontrado.');
      });
      const canReview = user?.role === 'ADM' || user?.role === 'DIGITAL' || user?.role === 'APPROVER';
      const proposal = canReview ? await db.projects.getProposal(projectId) : null;
      const revisions = await db.projects.listHistory(projectId);
      return {
        canApprove: user?.role === 'ADM' || (user?.role === 'APPROVER' && await db.projects.isApprover(projectId, user.id)),
        pending: proposal && {
          id: proposal.id,
          authorName: proposal.authorName,
          updatedByName: proposal.updatedByName,
          createdAt: proposal.createdAt.toISOString(),
          updatedAt: proposal.updatedAt.toISOString(),
          changes: JSON.parse(proposal.changes),
        },
        history: revisions
          .filter(revision => canReview || revision.status === 'APPROVED')
          .map(revision => ({
            id: revision.id,
            status: revision.status,
            authorName: revision.authorName,
            reviewerName: revision.reviewerName,
            createdAt: revision.createdAt.toISOString(),
            reviewedAt: revision.reviewedAt?.toISOString() ?? null,
            changes: JSON.parse(revision.changes),
          })),
      };
    });
    return respond(res, 200, history);
  }
  if (url.pathname === '/api/project-review' && req.method === 'POST') {
    if (user?.role !== 'ADM' && user?.role !== 'APPROVER') return respond(res, 403, { error: 'Somente administradores e aprovadores podem revisar mudanças.' });
    const id = text(url.searchParams.get('id'), 'a proposta');
    const body = objectInput(await readInput(req));
    if (body.action !== 'approve' && body.action !== 'reject') throw new RequestError(400, 'Informe uma ação de revisão válida.');
    const status = body.action === 'approve' ? 'APPROVED' : 'REJECTED';
    await storage.transaction(async db => {
      const proposal = await db.projects.getProposalById(id);
      if (!proposal) throw new RequestError(404, 'Proposta não encontrada ou já revisada.');
      if (user.role === 'APPROVER' && !(await db.projects.isApprover(proposal.projectId, user.id))) {
        throw new RequestError(403, 'Você não está designado como aprovador deste projeto.');
      }
      if (body.action === 'approve') {
        const project = await db.projects.get(proposal.projectId);
        if (!project) throw new RequestError(404, 'Projeto não encontrado.');
        await db.projects.save({ ...project, data: proposal.data, updatedAt: new Date() });
      }
      const reviewedAt = new Date();
      await db.projects.saveRevision({
        id: randomUUID(),
        projectId: proposal.projectId,
        snapshot: proposal.data,
        changes: proposal.changes,
        status,
        authorId: proposal.authorId,
        reviewerId: user.id,
        createdAt: proposal.createdAt,
        reviewedAt,
      });
      await db.projects.deleteProposal(proposal.projectId);
    });
    return respond(res, 200, { status });
  }
  if (url.pathname === '/api/project') {
    const id = url.searchParams.get('id') || 'proj_gestor_projetos';
    if (req.method === 'GET') {
      const data = await storage.read(async db => {
        const project = await db.projects.get(id);
        if (!project) throw new RequestError(404, 'Projeto não encontrado.');
        if (user?.role === 'ADM' || user?.role === 'DIGITAL') {
          const proposal = await db.projects.getProposal(id);
          if (proposal) return proposal.data;
        }
        return project.data;
      });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      return res.end(data);
    }
    if (req.method === 'POST') {
      const project = objectInput(await readInput(req, 5 * 1024 * 1024));
      const approverIds = approverIdsInput(project.approverIds);
      delete project.approverIds;
      const projectId = text(project.id, 'o ID do projeto');
      if (!user) throw new RequestError(401, 'Autenticação necessária.');
      const result = await storage.transaction(async db => {
        const links = (await db.tasks.byProject(projectId)).filter(task => task.featureId !== null);
        if (links.length && (!Array.isArray(project.nodes) || links.some(link => !Array.isArray(project.nodes) || !project.nodes.some(node => node && typeof node === 'object' && node.id === link.featureId && node.type === 'feature')))) {
          throw new RequestError(409, 'Remova os vínculos das tarefas antes de excluir funcionalidades do projeto.');
        }
        const current = await db.projects.get(projectId);
        if (!current) {
          await db.projects.save({ id: projectId, data: JSON.stringify(project), updatedAt: new Date() });
          if (approverIds !== undefined) await db.projects.setApprovers(projectId, approverIds);
          return { pending: false };
        }
        if (approverIds !== undefined) await db.projects.setApprovers(projectId, approverIds);
        const currentData: unknown = JSON.parse(current.data);
        const proposal = await db.projects.getProposal(projectId);
        const proposalData: unknown = proposal ? JSON.parse(proposal.data) : currentData;
        const updatedData = project as unknown;
        const changesSinceProposal = diffProjectChanges(proposalData, updatedData);
        const changesFromPublished = diffProjectChanges(currentData, updatedData);
        const updatedAt = new Date();
        const publishedWithLatestPresentation = mergeProjectPresentation(currentData, updatedData);
        await db.projects.save({
          ...current,
          data: JSON.stringify(publishedWithLatestPresentation),
          updatedAt,
        });

        if (changesFromPublished.length === 0) {
          if (proposal) {
            await db.projects.saveRevision({
              id: randomUUID(),
              projectId,
              snapshot: proposal.data,
              changes: proposal.changes,
              status: 'CANCELLED',
              authorId: proposal.authorId,
              reviewerId: null,
              createdAt: proposal.createdAt,
              reviewedAt: updatedAt,
            });
            await db.projects.deleteProposal(projectId);
          }
          return { pending: false };
        }

        const nextProposalData = proposal && changesSinceProposal.length === 0
          ? mergeProjectPresentation(JSON.parse(proposal.data), updatedData)
          : updatedData;
        await db.projects.saveProposal({
          id: proposal?.id || randomUUID(),
          projectId,
          data: JSON.stringify(nextProposalData),
          changes: JSON.stringify(changesFromPublished),
          authorId: proposal?.authorId || user.id,
          updatedById: user.id,
          createdAt: proposal?.createdAt || updatedAt,
          updatedAt,
        });
        return { pending: true };
      });
      return respond(res, 200, { success: true, savedAt: new Date().toISOString(), pending: result.pending });
    }
    if (req.method === 'DELETE') {
      await storage.transaction(async db => {
        if ((await db.tasks.byProject(id)).length) throw new RequestError(409, 'Remova as tarefas vinculadas antes de excluir o projeto.');
        if (await db.projects.get(id)) await db.projects.delete(id);
      });
      return respond(res, 200, { success: true, deleted: id });
    }
  }
  return respond(res, 405, { error: 'Método não permitido.' });
}
