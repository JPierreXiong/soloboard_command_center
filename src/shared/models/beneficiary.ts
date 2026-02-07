import { desc, eq, and } from 'drizzle-orm';

import { db } from '@/core/db';
import { beneficiaries } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export type Beneficiary = typeof beneficiaries.$inferSelect;
export type NewBeneficiary = typeof beneficiaries.$inferInsert;
export type UpdateBeneficiary = Partial<
  Omit<NewBeneficiary, 'id' | 'createdAt' | 'vaultId'>
>;

/**
 * 受益人状态枚举
 */
export enum BeneficiaryStatus {
  PENDING = 'pending',
  NOTIFIED = 'notified',
  UNLOCK_REQUESTED = 'unlock_requested', // 受益人已请求解锁，等待延迟期
  RELEASED = 'released',
}

/**
 * 创建受益人
 */
export async function createBeneficiary(newBeneficiary: NewBeneficiary) {
  const [result] = await db()
    .insert(beneficiaries)
    .values(newBeneficiary)
    .returning();

  return result;
}

/**
 * 根据 ID 查找受益人
 */
export async function findBeneficiaryById(id: string) {
  const [result] = await db()
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.id, id));

  return result;
}

/**
 * 根据保险箱 ID 查找所有受益人
 */
export async function findBeneficiariesByVaultId(vaultId: string) {
  const result = await db()
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.vaultId, vaultId))
    .orderBy(desc(beneficiaries.createdAt));

  return result;
}

/**
 * 根据状态查找受益人
 */
export async function findBeneficiariesByStatus(
  status: BeneficiaryStatus,
  vaultId?: string
) {
  const conditions = [eq(beneficiaries.status, status)];
  if (vaultId) {
    conditions.push(eq(beneficiaries.vaultId, vaultId));
  }

  const result = await db()
    .select()
    .from(beneficiaries)
    .where(and(...conditions))
    .orderBy(desc(beneficiaries.createdAt));

  return result;
}

/**
 * 根据 releaseToken 查找受益人
 */
export async function findBeneficiaryByToken(releaseToken: string) {
  const [result] = await db()
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.releaseToken, releaseToken));

  return result;
}

/**
 * 更新受益人
 */
export async function updateBeneficiary(
  id: string,
  updateBeneficiary: UpdateBeneficiary
) {
  const [result] = await db()
    .update(beneficiaries)
    .set(updateBeneficiary)
    .where(eq(beneficiaries.id, id))
    .returning();

  return result;
}

/**
 * 生成并设置释放令牌
 * 令牌有效期为 24 小时
 */
export async function generateReleaseToken(beneficiaryId: string) {
  const releaseToken = getUuid();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 小时后过期

  const [result] = await db()
    .update(beneficiaries)
    .set({
      releaseToken,
      releaseTokenExpiresAt: expiresAt,
      status: BeneficiaryStatus.NOTIFIED,
    })
    .where(eq(beneficiaries.id, beneficiaryId))
    .returning();

  return result;
}

/**
 * 验证释放令牌是否有效
 */
export async function validateReleaseToken(releaseToken: string) {
  const beneficiary = await findBeneficiaryByToken(releaseToken);

  if (!beneficiary) {
    return { valid: false, reason: 'Token not found' };
  }

  if (!beneficiary.releaseTokenExpiresAt) {
    return { valid: false, reason: 'Token has no expiration date' };
  }

  const now = new Date();
  const expiresAt = new Date(beneficiary.releaseTokenExpiresAt);

  if (now > expiresAt) {
    return { valid: false, reason: 'Token expired' };
  }

  return { valid: true, beneficiary };
}

/**
 * 请求解锁资产（受益人延迟解锁机制）
 * 设置 24 小时延迟期，期间向原用户发送通知
 */
export async function requestUnlock(beneficiaryId: string) {
  const now = new Date();
  const delayUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24小时后

  const [result] = await db()
    .update(beneficiaries)
    .set({
      status: BeneficiaryStatus.UNLOCK_REQUESTED,
      unlockRequestedAt: now,
      unlockDelayUntil: delayUntil,
      unlockNotificationSent: false,
    })
    .where(eq(beneficiaries.id, beneficiaryId))
    .returning();

  return result;
}

/**
 * 检查延迟解锁期是否已过
 */
export async function canUnlockNow(beneficiaryId: string) {
  const beneficiary = await findBeneficiaryById(beneficiaryId);

  if (!beneficiary || !beneficiary.unlockDelayUntil) {
    return { canUnlock: false, reason: 'No unlock request found' };
  }

  const now = new Date();
  const delayUntil = new Date(beneficiary.unlockDelayUntil);

  if (now < delayUntil) {
    return {
      canUnlock: false,
      reason: 'Delay period not expired',
      remainingHours: Math.ceil((delayUntil.getTime() - now.getTime()) / (60 * 60 * 1000)),
    };
  }

  return { canUnlock: true };
}

/**
 * 标记资产已释放（延迟期结束后）
 */
export async function markBeneficiaryAsReleased(beneficiaryId: string) {
  const [result] = await db()
    .update(beneficiaries)
    .set({
      status: BeneficiaryStatus.RELEASED,
      releasedAt: new Date(),
    })
    .where(eq(beneficiaries.id, beneficiaryId))
    .returning();

  return result;
}

/**
 * 标记已向原用户发送解锁通知
 */
export async function markUnlockNotificationSent(beneficiaryId: string) {
  const [result] = await db()
    .update(beneficiaries)
    .set({
      unlockNotificationSent: true,
    })
    .where(eq(beneficiaries.id, beneficiaryId))
    .returning();

  return result;
}

/**
 * 查找需要发送解锁通知的受益人（延迟解锁机制）
 */
export async function findBeneficiariesNeedingUnlockNotification() {
  const now = new Date();
  const result = await db()
    .select()
    .from(beneficiaries)
    .where(
      and(
        eq(beneficiaries.status, BeneficiaryStatus.UNLOCK_REQUESTED),
        eq(beneficiaries.unlockNotificationSent, false)
      )
    );

  // 过滤出已请求但未发送通知的受益人
  return result.filter((b: Beneficiary) => b.unlockRequestedAt && !b.unlockNotificationSent);
}

/**
 * 删除受益人
 */
export async function deleteBeneficiary(id: string) {
  const [result] = await db()
    .delete(beneficiaries)
    .where(eq(beneficiaries.id, id))
    .returning();

  return result;
}

/**
 * 批量创建受益人
 */
export async function createBeneficiaries(
  vaultId: string,
  beneficiariesData: Omit<NewBeneficiary, 'id' | 'vaultId' | 'createdAt' | 'updatedAt'>[]
) {
  const newBeneficiaries = beneficiariesData.map((data) => ({
    id: getUuid(),
    vaultId,
    ...data,
  }));

  const result = await db()
    .insert(beneficiaries)
    .values(newBeneficiaries)
    .returning();

  return result;
}

