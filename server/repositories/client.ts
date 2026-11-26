import type { Prisma, PrismaClient } from '@prisma/client';

export type Client = PrismaClient | Prisma.TransactionClient;

export function safeNumber(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new Error('O banco contém um número fora do intervalo permitido.');
  return result;
}
