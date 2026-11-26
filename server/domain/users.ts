import { RequestError } from '../http/helpers';
import { normalizeEmail } from './validation';

export type Role = 'ADM' | 'DIGITAL' | 'DEV' | 'USER';
export type User = { id: string; email: string; name: string; role: Role };
export type Identity = { issuer: string; subject: string; email: string; name: string };

export interface UserRepository {
  seedAdministrator(email: string): Promise<void>;
  authenticate(identity: Identity): Promise<User>;
  get(id: string): Promise<User | null>;
  list(): Promise<User[]>;
  setRole(id: string, role: Role): Promise<User>;
}

export function normalizeUserEmail(value: string) {
  try {
    const email = normalizeEmail(value);
    if (email) return email;
  } catch (error) {
    if (!(error instanceof RequestError)) throw error;
  }
  throw new RequestError(401, 'O provedor não informou um e-mail válido.');
}

export function isRole(value: unknown): value is Role {
  return value === 'ADM' || value === 'DIGITAL' || value === 'DEV' || value === 'USER';
}
