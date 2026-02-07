/**
 * POST /api/admin/digital-heirloom/vaults/[vaultId]/grant-compensation
 * 管理员补偿功能：支持延期订阅、重置/增加解密次数等
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { canAccessAdmin } from '@/core/rbac/permission';
import { findDigitalVaultById, updateDigitalVault } from '@/shared/models/digital-vault';
import { findBeneficiariesByVaultId, updateBeneficiary, Beneficiary } from '@/shared/models/beneficiary';
import { db } from '@/core/db';
import { digitalVaults, beneficiaries, adminAuditLogs } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { getUuid } from '@/shared/lib/hash';

export type CompensationType =
  | 'EXTEND_SUBSCRIPTION' // 延长订阅期限（天数）
  | 'RESET_DECRYPTION_COUNT' // 重置解密次数
  | 'ADD_DECRYPTION_COUNT' // 增加解密次数
  | 'ADD_BONUS_DECRYPTION_COUNT'; // 增加赠送解密次数

export interface CompensationRequest {
  type: CompensationType;
  value?: number; // 对于 EXTEND_SUBSCRIPTION: 天数；对于 ADD_DECRYPTION_COUNT: 增加的次数
  beneficiaryId?: string; // 可选：针对特定受益人（如果不提供，则应用到所有受益人）
  reason?: string; // 补偿原因（记录到审计日志）
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vaultId: string }> }
) {
  try {
    // 管理员认证
    const authResult = await requireAuth();
    if (authResult.error) {
      return authResult.error;
    }

    // 检查管理员权限
    const hasAdminAccess = await canAccessAdmin(authResult.user.id);
    if (!hasAdminAccess) {
      return respErr('Admin access required');
    }

    const { vaultId } = await params;

    // 查找保险箱
    const vault = await findDigitalVaultById(vaultId);
    if (!vault) {
      return respErr('Vault not found');
    }

    // 解析请求体
    const body: CompensationRequest = await request.json();
    const { type, value, beneficiaryId, reason, emailTemplate, emailSubject, emailMessage } = body as CompensationRequest & {
      emailTemplate?: string;
      emailSubject?: string;
      emailMessage?: string;
    };

    // 验证请求参数
    if (!type) {
      return respErr('Compensation type is required');
    }

    if (!reason || !reason.trim()) {
      return respErr('Compensation reason is required');
    }

    const adminUserId = authResult.user.id;
    const now = new Date();

    // 记录操作前状态
    const beforeState = {
      vault: {
        id: vault.id,
        status: vault.status,
        currentPeriodEnd: vault.currentPeriodEnd,
        bonusDays: vault.bonusDays,
      },
    };

    // 根据补偿类型执行操作
    switch (type) {
      case 'EXTEND_SUBSCRIPTION': {
        if (!value || value <= 0) {
          return respErr('Days value is required and must be positive');
        }

        // 计算新的结束日期：在现有结束日期基础上顺延，而非从今天开始
        const currentEndDate = vault.currentPeriodEnd
          ? new Date(vault.currentPeriodEnd)
          : new Date();
        const newEndDate = new Date(
          Math.max(currentEndDate.getTime(), Date.now()) + value * 24 * 60 * 60 * 1000
        );

        // 更新保险箱
        const updatedVault = await updateDigitalVault(vaultId, {
          currentPeriodEnd: newEndDate,
          bonusDays: (vault.bonusDays || 0) + value,
          // 如果因为过期而锁定，则自动解锁
          status: vault.status === 'inactive' ? 'active' : vault.status,
        });

        // 记录操作后状态
        const afterState = {
          vault: {
            id: updatedVault.id,
            status: updatedVault.status,
            currentPeriodEnd: updatedVault.currentPeriodEnd,
            bonusDays: updatedVault.bonusDays,
          },
        };

        // 记录审计日志到数据库
        await db().insert(adminAuditLogs).values({
          id: getUuid(),
          adminId: adminUserId,
          actionType: type,
          vaultId,
          actionData: {
            days: value,
            oldEndDate: currentEndDate.toISOString(),
            newEndDate: newEndDate.toISOString(),
            emailTemplate,
            emailSubject,
            emailMessage,
          },
          reason: reason.trim(),
          beforeState,
          afterState,
          createdAt: now,
        });

        return respData({
          vault: updatedVault,
          compensation: {
            type,
            daysAdded: value,
            newEndDate,
          },
          message: `Subscription extended by ${value} days`,
        });
      }

      case 'RESET_DECRYPTION_COUNT': {
        if (beneficiaryId) {
          // 重置特定受益人的解密次数
          const beneficiary = await db()
            .select()
            .from(beneficiaries)
            .where(eq(beneficiaries.id, beneficiaryId))
            .limit(1);

          if (!beneficiary || beneficiary.length === 0) {
            return respErr('Beneficiary not found');
          }

          if (beneficiary[0].vaultId !== vaultId) {
            return respErr('Beneficiary does not belong to this vault');
          }

          const beneficiaryBefore = beneficiary[0];
          await updateBeneficiary(beneficiaryId, {
            decryptionCount: 0,
          });
          const beneficiaryAfter = await db()
            .select()
            .from(beneficiaries)
            .where(eq(beneficiaries.id, beneficiaryId))
            .limit(1);

          // 记录审计日志
          await db().insert(adminAuditLogs).values({
            id: getUuid(),
            adminId: adminUserId,
            actionType: type,
            vaultId,
            beneficiaryId,
            actionData: {
              emailTemplate,
              emailSubject,
              emailMessage,
            },
            reason: reason.trim(),
            beforeState: {
              beneficiary: {
                id: beneficiaryBefore.id,
                decryptionCount: beneficiaryBefore.decryptionCount,
                decryptionLimit: beneficiaryBefore.decryptionLimit,
              },
            },
            afterState: {
              beneficiary: beneficiaryAfter[0] ? {
                id: beneficiaryAfter[0].id,
                decryptionCount: beneficiaryAfter[0].decryptionCount,
                decryptionLimit: beneficiaryAfter[0].decryptionLimit,
              } : {},
            },
            createdAt: now,
          });

          return respData({
            compensation: {
              type,
              beneficiaryId,
            },
            message: 'Decryption count reset for beneficiary',
          });
        } else {
          // 重置所有受益人的解密次数
          const allBeneficiaries = await findBeneficiariesByVaultId(vaultId);

          const beneficiariesBefore = allBeneficiaries.map((b: Beneficiary) => ({
            id: b.id,
            decryptionCount: b.decryptionCount,
            decryptionLimit: b.decryptionLimit,
          }));

          for (const beneficiary of allBeneficiaries) {
            await updateBeneficiary(beneficiary.id, {
              decryptionCount: 0,
            });
          }

          const beneficiariesAfter = await findBeneficiariesByVaultId(vaultId);

          // 记录审计日志
          await db().insert(adminAuditLogs).values({
            id: getUuid(),
            adminId: adminUserId,
            actionType: type,
            vaultId,
            actionData: {
              beneficiariesCount: allBeneficiaries.length,
              emailTemplate,
              emailSubject,
              emailMessage,
            },
            reason: reason.trim(),
            beforeState: {
              beneficiaries: beneficiariesBefore,
            },
            afterState: {
              beneficiaries: beneficiariesAfter.map((b: Beneficiary) => ({
                id: b.id,
                decryptionCount: b.decryptionCount,
                decryptionLimit: b.decryptionLimit,
              })),
            },
            createdAt: now,
          });

          return respData({
            compensation: {
              type,
              beneficiariesCount: allBeneficiaries.length,
            },
            message: `Decryption count reset for ${allBeneficiaries.length} beneficiaries`,
          });
        }
      }

      case 'ADD_DECRYPTION_COUNT':
      case 'ADD_BONUS_DECRYPTION_COUNT': {
        if (!value || value <= 0) {
          return respErr('Count value is required and must be positive');
        }

        if (beneficiaryId) {
          // 增加特定受益人的解密次数
          const beneficiary = await db()
            .select()
            .from(beneficiaries)
            .where(eq(beneficiaries.id, beneficiaryId))
            .limit(1);

          if (!beneficiary || beneficiary.length === 0) {
            return respErr('Beneficiary not found');
          }

          if (beneficiary[0].vaultId !== vaultId) {
            return respErr('Beneficiary does not belong to this vault');
          }

          const currentBeneficiary = beneficiary[0];

          const beneficiaryBefore = currentBeneficiary;
          
          if (type === 'ADD_DECRYPTION_COUNT') {
            // 直接增加已使用次数（减少剩余次数）
            await updateBeneficiary(beneficiaryId, {
              decryptionCount: Math.max(0, (currentBeneficiary.decryptionCount || 0) - value),
            });
          } else {
            // 增加赠送次数（增加总限制）
            await updateBeneficiary(beneficiaryId, {
              bonusDecryptionCount:
                (currentBeneficiary.bonusDecryptionCount || 0) + value,
            });
          }

          const beneficiaryAfter = await db()
            .select()
            .from(beneficiaries)
            .where(eq(beneficiaries.id, beneficiaryId))
            .limit(1);

          // 记录审计日志
          await db().insert(adminAuditLogs).values({
            id: getUuid(),
            adminId: adminUserId,
            actionType: type,
            vaultId,
            beneficiaryId,
            actionData: {
              count: value,
              emailTemplate,
              emailSubject,
              emailMessage,
            },
            reason: reason.trim(),
            beforeState: {
              beneficiary: {
                id: beneficiaryBefore.id,
                decryptionCount: beneficiaryBefore.decryptionCount,
                bonusDecryptionCount: beneficiaryBefore.bonusDecryptionCount,
              },
            },
            afterState: {
              beneficiary: beneficiaryAfter[0] ? {
                id: beneficiaryAfter[0].id,
                decryptionCount: beneficiaryAfter[0].decryptionCount,
                bonusDecryptionCount: beneficiaryAfter[0].bonusDecryptionCount,
              } : {},
            },
            createdAt: now,
          });

          return respData({
            compensation: {
              type,
              beneficiaryId,
              countAdded: value,
            },
            message: `Decryption count updated for beneficiary`,
          });
        } else {
          // 增加所有受益人的解密次数
          const allBeneficiaries = await findBeneficiariesByVaultId(vaultId);

          const beneficiariesBefore = allBeneficiaries.map((b: Beneficiary) => ({
            id: b.id,
            decryptionCount: b.decryptionCount,
            bonusDecryptionCount: b.bonusDecryptionCount,
          }));

          for (const beneficiary of allBeneficiaries) {
            if (type === 'ADD_DECRYPTION_COUNT') {
              await updateBeneficiary(beneficiary.id, {
                decryptionCount: Math.max(
                  0,
                  (beneficiary.decryptionCount || 0) - value
                ),
              });
            } else {
              await updateBeneficiary(beneficiary.id, {
                bonusDecryptionCount:
                  (beneficiary.bonusDecryptionCount || 0) + value,
              });
            }
          }

          const beneficiariesAfter = await findBeneficiariesByVaultId(vaultId);

          // 记录审计日志
          await db().insert(adminAuditLogs).values({
            id: getUuid(),
            adminId: adminUserId,
            actionType: type,
            vaultId,
            actionData: {
              count: value,
              beneficiariesCount: allBeneficiaries.length,
              emailTemplate,
              emailSubject,
              emailMessage,
            },
            reason: reason.trim(),
            beforeState: {
              beneficiaries: beneficiariesBefore,
            },
            afterState: {
              beneficiaries: beneficiariesAfter.map((b: Beneficiary) => ({
                id: b.id,
                decryptionCount: b.decryptionCount,
                bonusDecryptionCount: b.bonusDecryptionCount,
              })),
            },
            createdAt: now,
          });

          return respData({
            compensation: {
              type,
              beneficiariesCount: allBeneficiaries.length,
              countAdded: value,
            },
            message: `Decryption count updated for ${allBeneficiaries.length} beneficiaries`,
          });
        }
      }

      default:
        return respErr(`Unknown compensation type: ${type}`);
    }
  } catch (error: any) {
    console.error('Admin compensation failed:', error);
    return respErr(error.message || 'Failed to grant compensation');
  }
}
