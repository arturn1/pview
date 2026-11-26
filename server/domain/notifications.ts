export type EmailMessage = { to: string; subject: string; text: string };

// Contrato do serviço de e-mail. Uma implementação real chama a API própria da empresa.
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export type DeployedTask = { taskNumber: number; title: string };

// Contrato do caso de uso: avisar os inscritos de uma sprint sobre tarefas com deploy registrado.
export interface DeployNotifier {
  deployRecorded(taskIds: string[], deployDate: string): Promise<void>;
}

// Contrato do caso de uso: avisar os aprovadores do projeto sobre uma nova proposta pendente.
export interface ApprovalNotifier {
  proposalPending(projectId: string): Promise<void>;
}

export type Notifier = DeployNotifier & ApprovalNotifier;

export type DeploySubscriber = { id: string; name: string; email: string };

export interface DeploySubscriptionRepository {
  isSubscribed(sprintId: string, userId: string): Promise<boolean>;
  subscribe(sprintId: string, userId: string): Promise<void>;
  unsubscribe(sprintId: string, userId: string): Promise<void>;
  subscribers(sprintId: string): Promise<DeploySubscriber[]>;
}
