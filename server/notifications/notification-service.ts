import type { EmailMessage, EmailSender, Notifier } from '../domain/notifications';
import type { Storage } from '../domain/storage';

function displayDate(date: string) {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export class NotificationService implements Notifier {
  constructor(private readonly storage: Storage, private readonly email: EmailSender) {}

  // Falhas de envio são registradas e nunca interrompem a operação que registrou o deploy.
  async deployRecorded(taskIds: string[], deployDate: string) {
    try {
      const messages = await this.storage.read(async db => {
        const bySprint = new Map<string, { taskNumber: number; title: string }[]>();
        for (const id of taskIds) {
          const task = await db.tasks.get(id);
          const participant = task && await db.participants.get(task.participantId);
          if (!task || !participant) continue;
          bySprint.set(participant.sprintId, [...(bySprint.get(participant.sprintId) ?? []), { taskNumber: task.taskNumber, title: task.title }]);
        }
        const result = [];
        for (const [sprintId, tasks] of bySprint) {
          const sprint = await db.sprints.get(sprintId);
          if (!sprint) continue;
          const lines = tasks.sort((a, b) => a.taskNumber - b.taskNumber).map(task => `- #${task.taskNumber}${task.title ? ` · ${task.title}` : ''}`);
          for (const subscriber of await db.deploySubscriptions.subscribers(sprintId)) {
            result.push({
              to: subscriber.email,
              subject: `Deploy realizado em ${displayDate(deployDate)} · ${sprint.name}`,
              text: `Olá, ${subscriber.name}.\n\nO deploy das tarefas abaixo da sprint "${sprint.name}" foi registrado para ${displayDate(deployDate)}:\n\n${lines.join('\n')}\n`,
            });
          }
        }
        return result;
      });
      await this.deliver(messages);
    } catch (error) {
      console.error('[notificações] Falha ao preparar e-mails de deploy:', error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }

  async proposalPending(projectId: string) {
    try {
      const messages = await this.storage.read(async db => {
        const proposal = await db.projects.getProposal(projectId);
        const project = await db.projects.get(projectId);
        if (!proposal || !project) return [];
        const name: unknown = (JSON.parse(project.data) as { name?: unknown }).name;
        const projectName = typeof name === 'string' && name ? name : projectId;
        const changes: unknown = JSON.parse(proposal.changes);
        const count = Array.isArray(changes) ? changes.length : 0;
        const ids = new Set(await db.projects.listApproverIds(projectId));
        return (await db.projects.listApprovers()).filter(approver => ids.has(approver.id)).map(approver => ({
          to: approver.email,
          subject: `Aprovação pendente · ${projectName}`,
          text: `Olá, ${approver.name}.\n\n${proposal.authorName} enviou ${count} alteraç${count === 1 ? 'ão' : 'ões'} do projeto "${projectName}" para aprovação.\nAcesse o FlowDoc, abra o projeto e revise em Histórico.\n`,
        }));
      });
      await this.deliver(messages);
    } catch (error) {
      console.error('[notificações] Falha ao preparar e-mails de aprovação:', error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }

  private async deliver(messages: EmailMessage[]) {
    for (const message of messages) {
      try { await this.email.send(message); } catch (error) {
        console.error('[notificações] Falha ao enviar e-mail:', error instanceof Error ? error.message : 'Erro desconhecido');
      }
    }
  }
}
