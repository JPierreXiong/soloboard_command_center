import 'server-only'; // 强制此文件只能在服务端使用

import { desc, eq, and } from 'drizzle-orm';

import { db } from '@/core/db';
import { shippingLogs } from '@/config/db/schema';

// 导入枚举类型（用于函数参数类型）
import { ShippingStatus, ShippingFeeStatus } from './shipping-log-types';

// 导出枚举（从共享类型文件导入，避免客户端组件导入 server-only 模块）
export { ShippingStatus, ShippingFeeStatus } from './shipping-log-types';

export type ShippingLog = typeof shippingLogs.$inferSelect;
export type NewShippingLog = typeof shippingLogs.$inferInsert;
export type UpdateShippingLog = Partial<
  Omit<NewShippingLog, 'id' | 'createdAt' | 'vaultId' | 'beneficiaryId'>
>;

/**
 * 创建物流记录
 */
export async function createShippingLog(newLog: NewShippingLog) {
  const [result] = await db()
    .insert(shippingLogs)
    .values(newLog)
    .returning();

  return result;
}

/**
 * 根据 ID 查找物流记录
 */
export async function findShippingLogById(id: string) {
  const [result] = await db()
    .select()
    .from(shippingLogs)
    .where(eq(shippingLogs.id, id));

  return result;
}

/**
 * 根据保险箱 ID 查找所有物流记录
 */
export async function findShippingLogsByVaultId(vaultId: string) {
  const result = await db()
    .select()
    .from(shippingLogs)
    .where(eq(shippingLogs.vaultId, vaultId))
    .orderBy(desc(shippingLogs.createdAt));

  return result;
}

/**
 * 根据受益人 ID 查找所有物流记录
 */
export async function findShippingLogsByBeneficiaryId(beneficiaryId: string) {
  const result = await db()
    .select()
    .from(shippingLogs)
    .where(eq(shippingLogs.beneficiaryId, beneficiaryId))
    .orderBy(desc(shippingLogs.createdAt));

  return result;
}

/**
 * 根据状态查找物流记录（管理员列表）
 */
export async function findShippingLogsByStatus(
  status?: ShippingStatus,
  feeStatus?: ShippingFeeStatus,
  limit?: number,
  offset?: number
) {
  const conditions = [];
  
  if (status) {
    conditions.push(eq(shippingLogs.status, status));
  }
  
  if (feeStatus) {
    conditions.push(eq(shippingLogs.shippingFeeStatus, feeStatus));
  }

  let query = db().select().from(shippingLogs);
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(shippingLogs.createdAt)) as any;
  
  if (limit) {
    query = query.limit(limit) as any;
  }
  
  if (offset) {
    query = query.offset(offset) as any;
  }

  return await query;
}

/**
 * 根据 Creem Checkout ID 查找物流记录
 */
export async function findShippingLogByCheckoutId(checkoutId: string) {
  const [result] = await db()
    .select()
    .from(shippingLogs)
    .where(eq(shippingLogs.creemCheckoutId, checkoutId));

  return result;
}

/**
 * 更新物流记录
 */
export async function updateShippingLog(
  id: string,
  updateLog: UpdateShippingLog
) {
  const [result] = await db()
    .update(shippingLogs)
    .set(updateLog)
    .where(eq(shippingLogs.id, id))
    .returning();

  return result;
}

/**
 * 更新运费支付状态
 */
export async function updateShippingFeeStatus(
  id: string,
  feeStatus: ShippingFeeStatus,
  checkoutId?: string,
  paidAt?: Date
) {
  const updateData: UpdateShippingLog = {
    shippingFeeStatus: feeStatus,
    paidAt: paidAt || new Date(),
  };

  if (checkoutId) {
    updateData.creemCheckoutId = checkoutId;
  }

  // 如果支付完成，同时更新物流状态
  if (feeStatus === ShippingFeeStatus.PAID) {
    updateData.status = ShippingStatus.READY_TO_SHIP;
  }

  return updateShippingLog(id, updateData);
}

