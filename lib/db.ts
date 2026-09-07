import { PrismaClient } from '@prisma/client';

// One client per process, cached on globalThis in dev so hot reload doesn't
// exhaust the connection pool (same pattern as the Hive prototype's lib/db.ts).
// No soft-delete extension here: requests are never deleted — every record is
// governance evidence, and terminal states are the only form of "closed".

declare global {
  var prismaClientBase: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.prismaClientBase ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaClientBase = prisma;
}
