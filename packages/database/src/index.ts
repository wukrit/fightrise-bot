import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';

// Re-export Prisma enums that need both type and value exports
import { TournamentState, EventState, MatchState, StartggSyncStatus, DisputeStatus, RegistrationSource, RegistrationStatus, AdminRole, AuditAction, AuditSource } from '@prisma/client';
export { TournamentState, EventState, MatchState, StartggSyncStatus, DisputeStatus, RegistrationSource, RegistrationStatus, AdminRole, AuditAction, AuditSource };

export default prisma;
