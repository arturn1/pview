import type { IncomingMessage, ServerResponse } from 'node:http';

export class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function respond(res: ServerResponse, status: number, data: object) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export async function readInput(req: IncomingMessage, limit = 65536): Promise<unknown> {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) throw new RequestError(413, 'O corpo da requisição excede o limite.');
  }
  try {
    return JSON.parse(body);
  } catch (error) {
    if (error instanceof SyntaxError) throw new RequestError(400, 'JSON inválido.');
    throw error;
  }
}

export function objectInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RequestError(400, 'Dados inválidos.');
  return input as Record<string, unknown>;
}

export function text(value: unknown, label: string, required = true): string {
  if (typeof value !== 'string' || (required && !value.trim())) throw new RequestError(400, `Informe ${label}.`);
  return value.trim();
}

export function minutes(value: unknown, label: string, allowZero = true): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new RequestError(400, `${label} deve ser um número ${allowZero ? 'não negativo' : 'positivo'} de minutos.`);
  }
  return value;
}

export function handleError(res: ServerResponse, error: unknown) {
  if (error instanceof RequestError) return respond(res, error.status, { error: error.message });
  console.error('[api] Falha ao processar requisição:', error);
  return respond(res, 500, { error: 'Não foi possível processar a requisição.' });
}

