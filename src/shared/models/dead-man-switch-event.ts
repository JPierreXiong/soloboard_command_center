import { desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { deadManSwitchEvents } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export type DeadManSwitchEvent = typeof deadManSwitchEvents.$inferSelect;
export type NewDeadManSwitchEvent = typeof deadManSwitchEvents.$inferInsert;

/**
 * 死信开关事件类型枚举
 */
export enum DeadManSwitchEventType {
  WARNING_SENT = 'warning_sent',
  GRACE_PERIOD_STARTED = 'grace_period_started',
  ASSETS_RELEASED = 'assets_released',
  HEARTBEAT_RECEIVED = 'heartbeat_received',
  SWITCH_ACTIVATED = 'switch_activated',
  SWITCH_DEACTIVATED = 'switch_deactivated',
}

/**
 * 创建死信开关事件
 */
export async function createDeadManSwitchEvent(
  newEvent: NewDeadManSwitchEvent
) {
  const [result] = await db()
    .insert(deadManSwitchEvents)
    .values(newEvent)
    .returning();

  return result;
}

/**
 * 根据保险箱 ID 查找事件日志
 */
export async function findEventsByVaultId(
  vaultId: string,
  limit?: number
) {
  const query = db()
    .select()
    .from(deadManSwitchEvents)
    .where(eq(deadManSwitchEvents.vaultId, vaultId))
    .orderBy(desc(deadManSwitchEvents.createdAt));

  if (limit) {
    query.limit(limit);
  }

  const result = await query;
  return result;
}

/**
 * 根据事件类型查找事件
 */
export async function findEventsByType(
  eventType: DeadManSwitchEventType,
  limit?: number
) {
  const query = db()
    .select()
    .from(deadManSwitchEvents)
    .where(eq(deadManSwitchEvents.eventType, eventType))
    .orderBy(desc(deadManSwitchEvents.createdAt));

  if (limit) {
    query.limit(limit);
  }

  const result = await query;
  return result;
}

/**
 * 记录预警邮件发送事件
 */
export async function logWarningSentEvent(
  vaultId: string,
  eventData?: Record<string, any>
) {
  const newEvent: NewDeadManSwitchEvent = {
    id: getUuid(),
    vaultId,
    eventType: DeadManSwitchEventType.WARNING_SENT,
    eventData: eventData ? JSON.stringify(eventData) : null,
  };

  return createDeadManSwitchEvent(newEvent);
}

/**
 * 记录宽限期开始事件
 */
export async function logGracePeriodStartedEvent(
  vaultId: string,
  eventData?: Record<string, any>
) {
  const newEvent: NewDeadManSwitchEvent = {
    id: getUuid(),
    vaultId,
    eventType: DeadManSwitchEventType.GRACE_PERIOD_STARTED,
    eventData: eventData ? JSON.stringify(eventData) : null,
  };

  return createDeadManSwitchEvent(newEvent);
}

/**
 * 记录资产释放事件
 */
export async function logAssetsReleasedEvent(
  vaultId: string,
  eventData?: Record<string, any>
) {
  const newEvent: NewDeadManSwitchEvent = {
    id: getUuid(),
    vaultId,
    eventType: DeadManSwitchEventType.ASSETS_RELEASED,
    eventData: eventData ? JSON.stringify(eventData) : null,
  };

  return createDeadManSwitchEvent(newEvent);
}

/**
 * 记录心跳接收事件
 */
export async function logHeartbeatReceivedEvent(
  vaultId: string,
  eventData?: Record<string, any>
) {
  const newEvent: NewDeadManSwitchEvent = {
    id: getUuid(),
    vaultId,
    eventType: DeadManSwitchEventType.HEARTBEAT_RECEIVED,
    eventData: eventData ? JSON.stringify(eventData) : null,
  };

  return createDeadManSwitchEvent(newEvent);
}

/**
 * 记录死信开关激活事件
 */
export async function logSwitchActivatedEvent(
  vaultId: string,
  eventData?: Record<string, any>
) {
  const newEvent: NewDeadManSwitchEvent = {
    id: getUuid(),
    vaultId,
    eventType: DeadManSwitchEventType.SWITCH_ACTIVATED,
    eventData: eventData ? JSON.stringify(eventData) : null,
  };

  return createDeadManSwitchEvent(newEvent);
}

/**
 * 记录死信开关停用事件
 */
export async function logSwitchDeactivatedEvent(
  vaultId: string,
  eventData?: Record<string, any>
) {
  const newEvent: NewDeadManSwitchEvent = {
    id: getUuid(),
    vaultId,
    eventType: DeadManSwitchEventType.SWITCH_DEACTIVATED,
    eventData: eventData ? JSON.stringify(eventData) : null,
  };

  return createDeadManSwitchEvent(newEvent);
}

/**
 * 获取保险箱的事件统计
 */
export async function getEventStats(vaultId: string) {
  const events = await findEventsByVaultId(vaultId);

  const stats = {
    total: events.length,
    warningSent: events.filter(
      (e: DeadManSwitchEvent) => e.eventType === DeadManSwitchEventType.WARNING_SENT
    ).length,
    gracePeriodStarted: events.filter(
      (e: DeadManSwitchEvent) => e.eventType === DeadManSwitchEventType.GRACE_PERIOD_STARTED
    ).length,
    assetsReleased: events.filter(
      (e: DeadManSwitchEvent) => e.eventType === DeadManSwitchEventType.ASSETS_RELEASED
    ).length,
    heartbeatReceived: events.filter(
      (e: DeadManSwitchEvent) => e.eventType === DeadManSwitchEventType.HEARTBEAT_RECEIVED
    ).length,
    lastEvent: events[0] || null,
  };

  return stats;
}




