import { RequestError, text } from '../http/helpers';

export function normalizeEmail(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const email = text(value, 'o e-mail').toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new RequestError(400, 'Informe um e-mail válido.');
  return email;
}
