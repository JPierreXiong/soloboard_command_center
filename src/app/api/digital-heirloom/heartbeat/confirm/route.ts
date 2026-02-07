/**
 * POST /api/digital-heirloom/heartbeat/confirm
 * 心跳确认接口（用户点击邮件链接确认）
 * 无需登录，通过 verificationToken 验证
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import {
  updateDigitalVault,
  updateVaultHeartbeat,
  VaultStatus,
} from '@/shared/models/digital-vault';
import { recordHeartbeat } from '@/shared/models/heartbeat-log';
import { logHeartbeatReceivedEvent } from '@/shared/models/dead-man-switch-event';
import { getUuid } from '@/shared/lib/hash';
import { db } from '@/core/db';
import { digitalVaults, emailNotifications } from '@/config/db/schema';
import { eq, and, gte } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return respErr('Verification token is required');
    }

    // 查找包含此 token 的保险箱
    const vault = await db()
      .select()
      .from(digitalVaults)
      .where(
        and(
          eq(digitalVaults.verificationToken, token),
          // Token 未过期
          gte(digitalVaults.verificationTokenExpiresAt, new Date())
        )
      )
      .limit(1)
      .then((rows: typeof digitalVaults.$inferSelect[]) => rows[0]);

    if (!vault) {
      return respErr('Invalid or expired verification token');
    }

    // 验证 token 是否过期
    if (
      vault.verificationTokenExpiresAt &&
      new Date(vault.verificationTokenExpiresAt) < new Date()
    ) {
      return respErr('Verification token has expired');
    }

    // 更新心跳时间
    const updatedVault = await updateVaultHeartbeat(vault.id);

    // 生成新的 verificationToken（防止重复使用）
    const newToken = getUuid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

    await updateDigitalVault(vault.id, {
      verificationToken: newToken,
      verificationTokenExpiresAt: expiresAt,
      status: VaultStatus.ACTIVE, // 重置为活跃状态
      warningEmailCount: 0, // 重置预警邮件计数
      warningEmailSentAt: null,
      reminderEmailSentAt: null,
    });

    // 记录心跳日志
    await recordHeartbeat(vault.id, vault.userId);

    // 记录事件
    await logHeartbeatReceivedEvent(vault.id, {
      userId: vault.userId,
      timestamp: new Date().toISOString(),
      verificationToken: token, // 记录使用的 token（不包含新 token）
    });

    // 更新邮件通知状态为 clicked
    await db()
      .update(emailNotifications)
      .set({
        clickedAt: new Date(),
        status: 'clicked',
      })
      .where(
        and(
          eq(emailNotifications.vaultId, vault.id),
          eq(emailNotifications.emailType, 'heartbeat_warning'),
          eq(emailNotifications.status, 'sent')
        )
      );

    return respData({
      success: true,
      message: 'Heartbeat confirmed. Your vault is secure.',
      vaultId: vault.id,
      lastSeenAt: updatedVault.lastSeenAt,
    });
  } catch (error: any) {
    console.error('Heartbeat confirmation failed:', error);
    return respErr(error.message || 'Failed to confirm heartbeat');
  }
}
