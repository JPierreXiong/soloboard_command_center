/**
 * POST /api/admin/digital-heirloom/vaults/batch-compensate
 * 批量补偿功能（Super Admin）
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { canAccessAdmin } from '@/core/rbac/permission';
import { db } from '@/core/db';
import { digitalVaults, adminAuditLogs } from '@/config/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { updateDigitalVault } from '@/shared/models/digital-vault';
import { getUuid } from '@/shared/lib/hash';

export type BatchCompensationType =
  | 'EXTEND_SUBSCRIPTION' // 延长订阅期限（天数）
  | 'RESET_DECRYPTION_COUNT'; // 重置解密次数

export interface BatchCompensationRequest {
  type: BatchCompensationType;
  vaultIds: string[]; // 要补偿的金库 ID 列表
  value?: number; // 对于 EXTEND_SUBSCRIPTION: 天数
  reason: string; // 补偿原因（必填）
  emailTemplate?: string; // 邮件模板（可选）
}

export async function POST(request: NextRequest) {
  try {
    // 管理员认证
    const authResult = await requireAuth();
    if (authResult.error) {
      return authResult.error;
    }

    // 检查管理员权限（需要 Super Admin）
    const hasAdminAccess = await canAccessAdmin(authResult.user.id);
    if (!hasAdminAccess) {
      return respErr('Admin access required');
    }

    // TODO: 检查是否为 Super Admin（需要实现更细粒度的权限检查）
    // 目前使用 ADMIN_ACCESS 作为基础权限检查

    const body: BatchCompensationRequest = await request.json();
    const { type, vaultIds, value, reason } = body;

    // 验证请求参数
    if (!type) {
      return respErr('Compensation type is required');
    }

    if (!vaultIds || vaultIds.length === 0) {
      return respErr('Vault IDs are required');
    }

    if (vaultIds.length > 100) {
      return respErr('Maximum 100 vaults per batch operation');
    }

    if (!reason || !reason.trim()) {
      return respErr('Compensation reason is required');
    }

    if (type === 'EXTEND_SUBSCRIPTION' && (!value || value <= 0)) {
      return respErr('Days value is required and must be positive');
    }

    const adminUserId = authResult.user.id;
    const now = new Date();

    // 查询所有金库
    const vaults = await db()
      .select()
      .from(digitalVaults)
      .where(inArray(digitalVaults.id, vaultIds));

    if (vaults.length !== vaultIds.length) {
      return respErr(`Some vaults not found. Found ${vaults.length} of ${vaultIds.length}`);
    }

    const results = [];
    const errors = [];

    // 批量处理每个金库
    for (const vault of vaults) {
      try {
        let updatedVault;

        if (type === 'EXTEND_SUBSCRIPTION') {
          // 延长订阅期限
          const currentEndDate = vault.currentPeriodEnd
            ? new Date(vault.currentPeriodEnd)
            : new Date();
          const newEndDate = new Date(
            Math.max(currentEndDate.getTime(), Date.now()) + (value || 0) * 24 * 60 * 60 * 1000
          );

          updatedVault = await updateDigitalVault(vault.id, {
            currentPeriodEnd: newEndDate,
            bonusDays: (vault.bonusDays || 0) + (value || 0),
            status: vault.status === 'inactive' ? 'active' : vault.status,
          });

          // 记录审计日志
          await db().insert(adminAuditLogs).values({
            id: getUuid(),
            adminId: adminUserId,
            actionType: type,
            vaultId: vault.id,
            actionData: {
              days: value,
              oldEndDate: currentEndDate.toISOString(),
              newEndDate: newEndDate.toISOString(),
              batchOperation: true,
              emailTemplate: body.emailTemplate,
            },
            reason: reason.trim(),
            beforeState: {
              vault: {
                id: vault.id,
                status: vault.status,
                currentPeriodEnd: vault.currentPeriodEnd,
                bonusDays: vault.bonusDays,
              },
            },
            afterState: {
              vault: {
                id: updatedVault.id,
                status: updatedVault.status,
                currentPeriodEnd: updatedVault.currentPeriodEnd,
                bonusDays: updatedVault.bonusDays,
              },
            },
            createdAt: now,
          });

          results.push({
            vaultId: vault.id,
            success: true,
            message: `Subscription extended by ${value} days`,
            newEndDate: newEndDate.toISOString(),
          });
        } else if (type === 'RESET_DECRYPTION_COUNT') {
          // 重置解密次数（需要更新所有受益人）
          const { findBeneficiariesByVaultId, updateBeneficiary } = await import('@/shared/models/beneficiary');
          const beneficiaries = await findBeneficiariesByVaultId(vault.id);

          const beneficiariesBefore = beneficiaries.map((b: any) => ({
            id: b.id,
            decryptionCount: b.decryptionCount,
            decryptionLimit: b.decryptionLimit,
          }));

          for (const beneficiary of beneficiaries) {
            await updateBeneficiary(beneficiary.id, {
              decryptionCount: 0,
            });
          }

          const beneficiariesAfter = await findBeneficiariesByVaultId(vault.id);

          // 记录审计日志
          await db().insert(adminAuditLogs).values({
            id: getUuid(),
            adminId: adminUserId,
            actionType: type,
            vaultId: vault.id,
            actionData: {
              beneficiariesCount: beneficiaries.length,
              batchOperation: true,
              emailTemplate: body.emailTemplate,
            },
            reason: reason.trim(),
            beforeState: {
              beneficiaries: beneficiariesBefore,
            },
            afterState: {
              beneficiaries: beneficiariesAfter.map((b: any) => ({
                id: b.id,
                decryptionCount: b.decryptionCount,
                decryptionLimit: b.decryptionLimit,
              })),
            },
            createdAt: now,
          });

          results.push({
            vaultId: vault.id,
            success: true,
            message: `Decryption count reset for ${beneficiaries.length} beneficiaries`,
            beneficiariesCount: beneficiaries.length,
          });
        }
      } catch (error: any) {
        errors.push({
          vaultId: vault.id,
          error: error.message,
        });
      }
    }

    return respData({
      total: vaultIds.length,
      success: results.length,
      failed: errors.length,
      results,
      errors,
      message: `Batch compensation completed: ${results.length} success, ${errors.length} failed`,
    });
  } catch (error: any) {
    console.error('Batch compensation failed:', error);
    return respErr(error.message || 'Failed to perform batch compensation');
  }
}
