/**
 * Vercel Cron Job: Dead Man's Switch 检查
 * 每天 UTC 00:00 执行（北京时间 08:00）
 * 
 * 功能：
 * 1. 扫描需要发送预警的保险箱（ACTIVE -> PENDING_VERIFICATION）
 * 2. 扫描需要触发 Dead Man's Switch 的保险箱（PENDING_VERIFICATION -> TRIGGERED）
 * 3. 批量发送邮件
 * 4. 记录日志和统计
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  findVaultsNeedingWarning,
  findVaultsNeedingAssetRelease,
  updateDigitalVault,
  VaultStatus,
} from '@/shared/models/digital-vault';
import { getUuid } from '@/shared/lib/hash';
import {
  sendHeartbeatWarningEmail,
  sendHeartbeatReminderEmail,
  sendInheritanceNoticeEmail,
} from '@/shared/services/digital-heirloom/email-service';
import { logWarningSentEvent, logAssetsReleasedEvent } from '@/shared/models/dead-man-switch-event';
import { createLegacyAssetShipment } from '@/shared/services/shipany/shipment';
import { findBeneficiariesByVaultId } from '@/shared/models/beneficiary';
import { db } from '@/core/db';
import { shippingLogs, beneficiaries } from '@/config/db/schema';
import { getUserByUserIds } from '@/shared/models/user';
import { eq } from 'drizzle-orm';
import { getVaultPlanLevel } from '@/shared/lib/digital-heirloom-plan-limits';

export async function GET(request: NextRequest) {
  try {
    // 验证请求来源（Vercel Cron Secret）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.VERCEL_CRON_SECRET || process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    const results = {
      warningsSent: 0,
      remindersSent: 0,
      triggersExecuted: 0,
      errors: [] as string[],
    };

    // ============================================
    // 阶段 1: 发送预警邮件（ACTIVE -> PENDING_VERIFICATION）
    // ============================================
    console.log('[Cron] Scanning vaults needing warning...');
    const vaultsNeedingWarning = await findVaultsNeedingWarning();
    console.log(`[Cron] Found ${vaultsNeedingWarning.length} vaults needing warning`);

    for (const vault of vaultsNeedingWarning) {
      try {
        // Phase 4.4: 排除 Free 用户（Free 用户需要手动签到，不通过 Cron Job）
        const planLevel = await getVaultPlanLevel(vault.id);
        if (planLevel === 'free') {
          console.log(`[Cron] Vault ${vault.id} is Free plan, skipping automated check`);
          continue;
        }

        // 检查是否已发送过预警邮件（最多3次）
        if (vault.warningEmailCount && vault.warningEmailCount >= 3) {
          console.log(`[Cron] Vault ${vault.id} already sent 3 warning emails, skipping`);
          continue;
        }

        // 检查是否在24小时内已发送过
        if (vault.warningEmailSentAt) {
          const lastSent = new Date(vault.warningEmailSentAt);
          const hoursSinceLastSent = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastSent < 24) {
            console.log(`[Cron] Vault ${vault.id} sent warning email less than 24h ago, skipping`);
            continue;
          }
        }

        // 生成验证令牌
        const verificationToken = getUuid();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

        // 获取用户信息
        const users = await getUserByUserIds([vault.userId]);
        const user = users[0];
        if (!user || !user.email) {
          console.error(`[Cron] User ${vault.userId} not found or no email`);
          results.errors.push(`User ${vault.userId} not found`);
          continue;
        }

        // 计算天数
        const lastSeenDate = new Date(vault.lastSeenAt!);
        const daysSinceLastSeen = Math.floor(
          (Date.now() - lastSeenDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // 发送预警邮件
        const emailResult = await sendHeartbeatWarningEmail(
          vault.id,
          user.email,
          user.name || user.email,
          daysSinceLastSeen,
          vault.heartbeatFrequency || 90,
          vault.gracePeriod || 7,
          verificationToken,
          (user.language as any) || 'en'
        );

        if (emailResult.success) {
          // 更新保险箱状态和令牌
          await updateDigitalVault(vault.id, {
            status: VaultStatus.PENDING_VERIFICATION,
            verificationToken,
            verificationTokenExpiresAt: expiresAt,
            warningEmailSentAt: new Date(),
            warningEmailCount: (vault.warningEmailCount || 0) + 1,
          });

          // 记录事件
          await logWarningSentEvent(vault.id, {
            userId: vault.userId,
            emailSent: true,
            verificationToken,
          });

          results.warningsSent++;
          console.log(`[Cron] Warning email sent for vault ${vault.id}`);
        } else {
          results.errors.push(`Failed to send warning email for vault ${vault.id}: ${emailResult.error}`);
        }
      } catch (error: any) {
        console.error(`[Cron] Error processing vault ${vault.id}:`, error);
        results.errors.push(`Vault ${vault.id}: ${error.message}`);
      }
    }

    // ============================================
    // 阶段 2: 发送二次提醒邮件（宽限期倒计时）
    // ============================================
    console.log('[Cron] Scanning vaults needing reminder...');
    const vaultsNeedingReminder = await findVaultsNeedingWarning();
    
    for (const vault of vaultsNeedingReminder) {
      try {
        // 检查是否在宽限期最后24小时
        if (!vault.lastSeenAt) continue;
        
        const lastSeenDate = new Date(vault.lastSeenAt);
        const heartbeatFrequencyDays = vault.heartbeatFrequency || 90;
        const gracePeriodDays = vault.gracePeriod || 7;
        
        const deadlineDate = new Date(
          lastSeenDate.getTime() + heartbeatFrequencyDays * 24 * 60 * 60 * 1000
        );
        const gracePeriodEndDate = new Date(
          deadlineDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000
        );
        
        const hoursRemaining = Math.floor(
          (gracePeriodEndDate.getTime() - Date.now()) / (1000 * 60 * 60)
        );
        
        // 如果剩余时间在24小时内，且未发送过提醒邮件
        if (hoursRemaining > 0 && hoursRemaining <= 24 && !vault.reminderEmailSentAt) {
          const users = await getUserByUserIds([vault.userId]);
          const user = users[0];
          if (!user || !user.email) continue;
          
          const daysSinceLastSeen = Math.floor(
            (Date.now() - lastSeenDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          const emailResult = await sendHeartbeatReminderEmail(
            vault.id,
            user.email,
            user.name || user.email,
            daysSinceLastSeen,
            hoursRemaining,
            vault.verificationToken || getUuid(),
            (user.language as any) || 'en'
          );
          
          if (emailResult.success) {
            await updateDigitalVault(vault.id, {
              reminderEmailSentAt: new Date(),
            });
            results.remindersSent++;
          }
        }
      } catch (error: any) {
        console.error(`[Cron] Error sending reminder for vault ${vault.id}:`, error);
        results.errors.push(`Reminder ${vault.id}: ${error.message}`);
      }
    }

    // ============================================
    // 阶段 3: 触发 Dead Man's Switch（PENDING_VERIFICATION -> TRIGGERED）
    // ============================================
    console.log('[Cron] Scanning vaults needing asset release...');
    const vaultsNeedingRelease = await findVaultsNeedingAssetRelease();
    console.log(`[Cron] Found ${vaultsNeedingRelease.length} vaults needing release`);

    for (const vault of vaultsNeedingRelease) {
      try {
        // Phase 4.4: 排除 Free 用户（Free 用户需要手动签到，不通过 Cron Job）
        const planLevel = await getVaultPlanLevel(vault.id);
        if (planLevel === 'free') {
          console.log(`[Cron] Vault ${vault.id} is Free plan, skipping automated trigger`);
          continue;
        }

        // 更新状态为 TRIGGERED
        await updateDigitalVault(vault.id, {
          status: VaultStatus.TRIGGERED,
          deadManSwitchActivatedAt: new Date(),
        });

        // 获取受益人列表
        const beneficiariesList = await findBeneficiariesByVaultId(vault.id);
        if (beneficiariesList.length === 0) {
          console.warn(`[Cron] Vault ${vault.id} has no beneficiaries`);
          results.errors.push(`Vault ${vault.id} has no beneficiaries`);
          continue;
        }

        // 获取用户信息
        const users = await getUserByUserIds([vault.userId]);
        const user = users[0];

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
              } catch (shipmentError: any) {
                console.error(`[Cron] Failed to create shipment for beneficiary ${beneficiary.id}:`, shipmentError);
                results.errors.push(`Shipment ${beneficiary.id}: ${shipmentError.message}`);
                // 记录到数据库，标记为需要管理员审核
                // 注意：不阻塞主流程，继续发送邮件通知
              }
            } else {
              // 地址不完整，记录错误但不阻塞流程
              console.warn(`[Cron] Beneficiary ${beneficiary.id} has incomplete address, skipping shipment`);
              results.errors.push(`Beneficiary ${beneficiary.id}: Incomplete address information`);
            }

            // 发送继承通知邮件
            const emailResult = await sendInheritanceNoticeEmail(
              vault.id,
              beneficiary.email,
              beneficiary.name,
              user?.name || user?.email || 'Unknown',
              releaseToken,
              shippingTrackingNumber,
              shippingCarrier,
              (beneficiary.language as any) || 'en'
            );

            if (!emailResult.success) {
              results.errors.push(`Inheritance email ${beneficiary.id}: ${emailResult.error}`);
            }
          } catch (error: any) {
            console.error(`[Cron] Error processing beneficiary ${beneficiary.id}:`, error);
            results.errors.push(`Beneficiary ${beneficiary.id}: ${error.message}`);
          }
        }

        // 记录资产释放事件
        await logAssetsReleasedEvent(vault.id, {
          userId: vault.userId,
          beneficiariesCount: beneficiariesList.length,
          timestamp: new Date().toISOString(),
        });

        results.triggersExecuted++;
        console.log(`[Cron] Dead Man's Switch triggered for vault ${vault.id}`);
      } catch (error: any) {
        console.error(`[Cron] Error triggering vault ${vault.id}:`, error);
        results.errors.push(`Trigger ${vault.id}: ${error.message}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron] Completed in ${duration}ms`);
    console.log(`[Cron] Results:`, results);

    return NextResponse.json({
      success: true,
      duration,
      ...results,
    });
  } catch (error: any) {
    console.error('[Cron] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
