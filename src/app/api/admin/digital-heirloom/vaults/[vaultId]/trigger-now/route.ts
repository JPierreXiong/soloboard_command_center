/**
 * POST /api/admin/digital-heirloom/vaults/:vaultId/trigger-now
 * 管理员立即触发 Dead Man's Switch（紧急情况）
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { canAccessAdmin } from '@/core/rbac/permission';
import {
  findDigitalVaultById,
  updateDigitalVault,
  VaultStatus,
} from '@/shared/models/digital-vault';
import { findBeneficiariesByVaultId } from '@/shared/models/beneficiary';
import { getUserByUserIds } from '@/shared/models/user';
import { getUuid } from '@/shared/lib/hash';
import { sendInheritanceNoticeEmail } from '@/shared/services/digital-heirloom/email-service';
import { createLegacyAssetShipment } from '@/shared/services/shipany/shipment';
import { logAssetsReleasedEvent } from '@/shared/models/dead-man-switch-event';
import { db } from '@/core/db';
import { shippingLogs, beneficiaries } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

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
    const body = await request.json();
    const { reason, adminNotes } = body;

    // 查找保险箱
    const vault = await findDigitalVaultById(vaultId);
    if (!vault) {
      return respErr('Vault not found');
    }

    // 检查是否已经触发
    if (vault.status === VaultStatus.TRIGGERED) {
      return respErr('Dead Man\'s Switch has already been triggered');
    }

    // 更新状态为 TRIGGERED
    await updateDigitalVault(vaultId, {
      status: VaultStatus.TRIGGERED,
      deadManSwitchActivatedAt: new Date(),
    });

    // 获取受益人列表
    const beneficiariesList = await findBeneficiariesByVaultId(vaultId);
    if (beneficiariesList.length === 0) {
      return respErr('Vault has no beneficiaries');
    }

    // 获取用户信息
    const users = await getUserByUserIds([vault.userId]);
    const user = users[0];

    const results = {
      beneficiariesNotified: 0,
      shipmentsCreated: 0,
      errors: [] as string[],
    };

    // 为每个受益人发送通知并创建物流订单
    for (const beneficiary of beneficiariesList) {
      try {
        // 生成释放令牌
        const releaseToken = getUuid();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90); // 90天后过期

        // 更新受益人的释放令牌
        await db()
          .update(beneficiaries)
          .set({
            releaseToken,
            releaseTokenExpiresAt: expiresAt,
            status: 'notified',
          })
          .where(eq(beneficiaries.id, beneficiary.id));

        // 发送继承通知邮件
        let shippingTrackingNumber: string | undefined;
        let shippingCarrier: string | undefined;

        // 如果受益人有完整地址信息，创建物流订单
        // 地址校验：确保所有必填字段都存在且非空
        const hasValidAddress =
          beneficiary.receiverName &&
          beneficiary.receiverName.trim() !== '' &&
          beneficiary.addressLine1 &&
          beneficiary.addressLine1.trim() !== '' &&
          beneficiary.city &&
          beneficiary.city.trim() !== '' &&
          beneficiary.zipCode &&
          beneficiary.zipCode.trim() !== '' &&
          beneficiary.countryCode &&
          beneficiary.countryCode.trim() !== '' &&
          beneficiary.phone &&
          beneficiary.phone.trim() !== '';

        if (hasValidAddress) {
          try {
            const shipmentResult = await createLegacyAssetShipment(
              beneficiary,
              beneficiary.physicalAssetDescription || 'Legacy Asset: Encrypted Recovery Kit'
            );

            shippingTrackingNumber = shipmentResult.tracking_number;
            shippingCarrier = shipmentResult.status;

            // 创建物流日志
            const shippingLogId = getUuid();
            await db()
              .insert(shippingLogs)
              .values({
                id: shippingLogId,
                vaultId: vault.id,
                beneficiaryId: beneficiary.id,
                receiverName: beneficiary.receiverName,
                receiverPhone: beneficiary.phone,
                addressLine1: beneficiary.addressLine1,
                city: beneficiary.city,
                zipCode: beneficiary.zipCode,
                countryCode: beneficiary.countryCode,
                trackingNumber: shippingTrackingNumber,
                carrier: shippingCarrier,
                status: 'shipped',
                shippedAt: new Date(),
              });

            results.shipmentsCreated++;
          } catch (shipmentError: any) {
            console.error(`Failed to create shipment for beneficiary ${beneficiary.id}:`, shipmentError);
            results.errors.push(`Shipment ${beneficiary.id}: ${shipmentError.message}`);
            // 记录到数据库，标记为需要管理员审核
            // 注意：不阻塞主流程，继续发送邮件通知
          }
        } else {
          // 地址不完整，记录错误但不阻塞流程
          console.warn(`Beneficiary ${beneficiary.id} has incomplete address, skipping shipment`);
          results.errors.push(`Beneficiary ${beneficiary.id}: Incomplete address information`);
        }

        // 发送继承通知邮件
        const emailResult = await sendInheritanceNoticeEmail(
          vaultId,
          beneficiary.email,
          beneficiary.name,
          user?.name || user?.email || 'Unknown',
          releaseToken,
          shippingTrackingNumber,
          shippingCarrier,
          (beneficiary.language as any) || 'en'
        );

        if (emailResult.success) {
          results.beneficiariesNotified++;
        } else {
          results.errors.push(`Email ${beneficiary.id}: ${emailResult.error}`);
        }
      } catch (error: any) {
        console.error(`Error processing beneficiary ${beneficiary.id}:`, error);
        results.errors.push(`Beneficiary ${beneficiary.id}: ${error.message}`);
      }
    }

    // 记录资产释放事件（标记为管理员操作）
    await logAssetsReleasedEvent(vaultId, {
      userId: vault.userId,
      adminId: authResult.user.id,
      adminAction: true,
      reason: reason || 'Admin triggered',
      adminNotes,
      beneficiariesCount: beneficiariesList.length,
      timestamp: new Date().toISOString(),
    });

    return respData({
      success: true,
      vaultId,
      status: VaultStatus.TRIGGERED,
      ...results,
      message: 'Dead Man\'s Switch triggered successfully by admin',
    });
  } catch (error: any) {
    console.error('Failed to trigger Dead Man\'s Switch:', error);
    return respErr(error.message || 'Failed to trigger Dead Man\'s Switch');
  }
}
