import { desc, eq, and, gte, lte } from 'drizzle-orm';

import { db } from '@/core/db';
import { digitalVaults } from '@/config/db/schema';

export type DigitalVault = typeof digitalVaults.$inferSelect;
export type NewDigitalVault = typeof digitalVaults.$inferInsert;
export type UpdateDigitalVault = Partial<
  Omit<NewDigitalVault, 'id' | 'createdAt' | 'userId'>
>;

/**
 * 数字保险箱状态枚举
 */
export enum VaultStatus {
  ACTIVE = 'active',
  WARNING = 'warning',
  PENDING_VERIFICATION = 'pending_verification', // 等待用户确认（宽限期）
  TRIGGERED = 'triggered', // Dead Man's Switch 已触发
  ACTIVATED = 'activated',
  RELEASED = 'released',
}

/**
 * 创建数字保险箱
 */
export async function createDigitalVault(newVault: NewDigitalVault) {
  const [result] = await db()
    .insert(digitalVaults)
    .values(newVault)
    .returning();

  return result;
}

/**
 * 根据 ID 查找数字保险箱
 */
export async function findDigitalVaultById(id: string) {
  const [result] = await db()
    .select()
    .from(digitalVaults)
    .where(eq(digitalVaults.id, id));

  return result;
}

/**
 * 根据用户 ID 查找数字保险箱
 */
export async function findDigitalVaultByUserId(userId: string) {
  const [result] = await db()
    .select()
    .from(digitalVaults)
    .where(eq(digitalVaults.userId, userId))
    .orderBy(desc(digitalVaults.createdAt))
    .limit(1);

  return result;
}

/**
 * 获取用户的所有数字保险箱
 */
export async function getDigitalVaultsByUserId(
  userId: string,
  status?: VaultStatus
) {
  const conditions = [eq(digitalVaults.userId, userId)];
  if (status) {
    conditions.push(eq(digitalVaults.status, status));
  }

  const result = await db()
    .select()
    .from(digitalVaults)
    .where(and(...conditions))
    .orderBy(desc(digitalVaults.createdAt));

  return result;
}

/**
 * 更新数字保险箱
 */
export async function updateDigitalVault(
  id: string,
  updateVault: UpdateDigitalVault
) {
  const [result] = await db()
    .update(digitalVaults)
    .set(updateVault)
    .where(eq(digitalVaults.id, id))
    .returning();

  return result;
}

/**
 * 更新最后活跃时间（心跳）
 */
export async function updateVaultHeartbeat(vaultId: string) {
  const [result] = await db()
    .update(digitalVaults)
    .set({
      lastSeenAt: new Date(),
      status: VaultStatus.ACTIVE, // 重置为活跃状态
    })
    .where(eq(digitalVaults.id, vaultId))
    .returning();

  return result;
}

/**
 * 查找需要检查失联状态的保险箱
 * 查询条件：status = 'active' 且 lastSeenAt + heartbeatFrequency < now()
 */
export async function findVaultsNeedingDeadManSwitchCheck() {
  const now = new Date();
  const result = await db()
    .select()
    .from(digitalVaults)
    .where(
      and(
        eq(digitalVaults.status, VaultStatus.ACTIVE),
        eq(digitalVaults.deadManSwitchEnabled, true)
      )
    );

  // 在应用层过滤：检查 lastSeenAt + heartbeatFrequency 是否超过当前时间
  const vaultsNeedingCheck = result.filter((vault: DigitalVault) => {
    if (!vault.lastSeenAt) return false;

    const lastSeenDate = new Date(vault.lastSeenAt);
    const heartbeatFrequencyDays = vault.heartbeatFrequency || 90;
    const deadlineDate = new Date(
      lastSeenDate.getTime() + heartbeatFrequencyDays * 24 * 60 * 60 * 1000
    );

    return deadlineDate < now;
  });

  return vaultsNeedingCheck;
}

/**
 * 查找需要发送预警的保险箱
 * 查询条件：status = 'active' 且已超过心跳期限但未超过宽限期
 * 状态机：ACTIVE -> PENDING_VERIFICATION
 */
export async function findVaultsNeedingWarning() {
  const now = new Date();
  const result = await db()
    .select()
    .from(digitalVaults)
    .where(
      and(
        eq(digitalVaults.status, VaultStatus.ACTIVE),
        eq(digitalVaults.deadManSwitchEnabled, true)
      )
    );

  const vaultsNeedingWarning = result.filter((vault: DigitalVault) => {
    if (!vault.lastSeenAt) return false;

    const lastSeenDate = new Date(vault.lastSeenAt);
    const heartbeatFrequencyDays = vault.heartbeatFrequency || 90;
    const gracePeriodDays = vault.gracePeriod || 7;

    const deadlineDate = new Date(
      lastSeenDate.getTime() + heartbeatFrequencyDays * 24 * 60 * 60 * 1000
    );
    const gracePeriodEndDate = new Date(
      deadlineDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000
    );

    // 已超过心跳期限但未超过宽限期
    return deadlineDate < now && now < gracePeriodEndDate;
  });

  return vaultsNeedingWarning;
}

/**
 * 查找需要释放资产的保险箱
 * 查询条件：status = 'pending_verification' 且已超过宽限期
 * 状态机：PENDING_VERIFICATION -> TRIGGERED
 */
export async function findVaultsNeedingAssetRelease() {
  const now = new Date();
  const result = await db()
    .select()
    .from(digitalVaults)
    .where(
      and(
        eq(digitalVaults.status, VaultStatus.PENDING_VERIFICATION),
        eq(digitalVaults.deadManSwitchEnabled, true)
      )
    );

  const vaultsNeedingRelease = result.filter((vault: DigitalVault) => {
    if (!vault.lastSeenAt) return false;

    const lastSeenDate = new Date(vault.lastSeenAt);
    const heartbeatFrequencyDays = vault.heartbeatFrequency || 90;
    const gracePeriodDays = vault.gracePeriod || 7;

    const deadlineDate = new Date(
      lastSeenDate.getTime() + heartbeatFrequencyDays * 24 * 60 * 60 * 1000
    );
    const gracePeriodEndDate = new Date(
      deadlineDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000
    );

    // 已超过宽限期
    return now >= gracePeriodEndDate;
  });

  return vaultsNeedingRelease;
}

/**
 * 删除数字保险箱（软删除，通过状态标记）
 */
export async function deleteDigitalVault(id: string) {
  const [result] = await db()
    .update(digitalVaults)
    .set({
      status: VaultStatus.RELEASED,
    })
    .where(eq(digitalVaults.id, id))
    .returning();

  return result;
}
