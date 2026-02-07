import { desc, eq, and } from 'drizzle-orm';

import { db } from '@/core/db';
import { heartbeatLogs } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export type HeartbeatLog = typeof heartbeatLogs.$inferSelect;
export type NewHeartbeatLog = typeof heartbeatLogs.$inferInsert;

/**
 * 创建心跳日志
 */
export async function createHeartbeatLog(newLog: NewHeartbeatLog) {
  const [result] = await db()
    .insert(heartbeatLogs)
    .values(newLog)
    .returning();

  return result;
}

/**
 * 记录用户心跳（如果今天还没有记录）
 */
export async function recordHeartbeat(vaultId: string, userId: string) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 检查今天是否已经记录过
  const existing = await db()
    .select()
    .from(heartbeatLogs)
    .where(
      and(
        eq(heartbeatLogs.vaultId, vaultId),
        eq(heartbeatLogs.checkinDate, today)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // 今天已经记录过，返回现有记录
    return existing[0];
  }

  // 创建新的心跳记录
  const newLog: NewHeartbeatLog = {
    id: getUuid(),
    vaultId,
    userId,
    checkinDate: today,
  };

  const [result] = await db()
    .insert(heartbeatLogs)
    .values(newLog)
    .returning();

  return result;
}

/**
 * 根据保险箱 ID 查找心跳日志
 */
export async function findHeartbeatLogsByVaultId(
  vaultId: string,
  limit?: number
) {
  const query = db()
    .select()
    .from(heartbeatLogs)
    .where(eq(heartbeatLogs.vaultId, vaultId))
    .orderBy(desc(heartbeatLogs.createdAt));

  if (limit) {
    query.limit(limit);
  }

  const result = await query;
  return result;
}

/**
 * 根据用户 ID 查找心跳日志
 */
export async function findHeartbeatLogsByUserId(
  userId: string,
  limit?: number
) {
  const query = db()
    .select()
    .from(heartbeatLogs)
    .where(eq(heartbeatLogs.userId, userId))
    .orderBy(desc(heartbeatLogs.createdAt));

  if (limit) {
    query.limit(limit);
  }

  const result = await query;
  return result;
}

/**
 * 获取用户最近的心跳记录
 */
export async function getLatestHeartbeatLog(vaultId: string) {
  const [result] = await db()
    .select()
    .from(heartbeatLogs)
    .where(eq(heartbeatLogs.vaultId, vaultId))
    .orderBy(desc(heartbeatLogs.createdAt))
    .limit(1);

  return result;
}

/**
 * 检查用户今天是否已经记录过心跳
 */
export async function hasHeartbeatToday(vaultId: string) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const [result] = await db()
    .select()
    .from(heartbeatLogs)
    .where(
      and(
        eq(heartbeatLogs.vaultId, vaultId),
        eq(heartbeatLogs.checkinDate, today)
      )
    )
    .limit(1);

  return !!result;
}

/**
 * 获取心跳统计信息
 */
export async function getHeartbeatStats(vaultId: string) {
  const logs = await findHeartbeatLogsByVaultId(vaultId);

  const totalCount = logs.length;
  const lastHeartbeat = logs[0]?.createdAt || null;
  const consecutiveDays = calculateConsecutiveDays(logs);

  return {
    totalCount,
    lastHeartbeat,
    consecutiveDays,
  };
}

/**
 * 计算连续心跳天数
 */
function calculateConsecutiveDays(logs: HeartbeatLog[]): number {
  if (logs.length === 0) return 0;

  // 按日期排序（降序）
  const sortedLogs = [...logs].sort(
    (a, b) => b.checkinDate.localeCompare(a.checkinDate)
  );

  let consecutiveDays = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedLogs.length; i++) {
    const logDate = new Date(sortedLogs[i].checkinDate);
    logDate.setHours(0, 0, 0, 0);

    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);

    if (
      logDate.getTime() === expectedDate.getTime() ||
      (i === 0 && logDate.getTime() === today.getTime())
    ) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  return consecutiveDays;
}




