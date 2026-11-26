import type { EmailMessage, EmailSender } from '../domain/notifications';

// Implementação provisória: apenas registra o e-mail no log, sem enviar nada.
export class MockEmailSender implements EmailSender {
  async send(message: EmailMessage) {
    console.log(`[email:mock] Para: ${message.to} | Assunto: ${message.subject}\n${message.text}`);
  }
}

export function createEmailSender(env: NodeJS.ProcessEnv = process.env): EmailSender {
  const provider = env.EMAIL_PROVIDER || 'mock';
  if (provider === 'mock') return new MockEmailSender();
  throw new Error(`EMAIL_PROVIDER "${provider}" não é suportado.`);
}
