import { prisma, AuditAction, AuditSource } from '@fightrise/database';

export type { AuditAction, AuditSource } from '@fightrise/database';

/**
 * Arguments for creating an audit log entry
 */
export interface CreateAuditLogParams {
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  source?: AuditSource;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  const { action, entityType, entityId, userId, before, after, reason, source = AuditSource.DISCORD } = params;

  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        before: before ?? undefined,
        after: after ?? undefined,
        reason: reason ?? undefined,
        source,
      },
    });
  } catch (error) {
    // Log but don't throw - audit logging should not break main functionality
    console.error('[AuditLog] Failed to create audit log:', error);
  }
}

/**
 * Query parameters for fetching audit logs
 */
export interface QueryAuditLogsParams {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Query audit logs with filtering
 */
export async function queryAuditLogs(params: QueryAuditLogsParams): Promise<{
  logs: Array<{
    id: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    userId: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    reason: string | null;
    source: AuditSource;
    createdAt: Date;
  }>;
  total: number;
}> {
  const { entityType, entityId, userId, action, startDate, endDate, limit = 50, offset = 0 } = params;

  const where: Record<string, unknown> = {};

  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;
  if (action) where.action = action;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, unknown>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, unknown>).lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            discordUsername: true,
            startggGamerTag: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      userId: log.userId,
      before: log.before as Record<string, unknown> | null,
      after: log.after as Record<string, unknown> | null,
      reason: log.reason,
      source: log.source,
      createdAt: log.createdAt,
    })),
    total,
  };
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLogs(
  entityType: string,
  entityId: string,
  limit = 20
): Promise<Array<{
  id: string;
  action: AuditAction;
  userId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  source: AuditSource;
  createdAt: Date;
}>> {
  const logs = await prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    userId: log.userId,
    before: log.before as Record<string, unknown> | null,
    after: log.after as Record<string, unknown> | null,
    reason: log.reason,
    source: log.source,
    createdAt: log.createdAt,
  }));
}
