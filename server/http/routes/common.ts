import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Storage } from '../../domain/storage';
import type { Notifier } from '../../domain/notifications';
import type { User } from '../../domain/users';
import { RequestError } from '../helpers';

export type RouteContext = {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  storage: Storage;
  notifier: Notifier;
  userFor: (req: IncomingMessage) => User | undefined;
};

export function idParam(url: URL) {
  const id = url.searchParams.get('id');
  if (!id) throw new RequestError(400, 'Informe o ID do registro.');
  return id;
}

export async function required<T>(value: Promise<T | null>, label: string): Promise<T> {
  const result = await value;
  if (!result) throw new RequestError(404, `${label} não encontrado.`);
  return result;
}
