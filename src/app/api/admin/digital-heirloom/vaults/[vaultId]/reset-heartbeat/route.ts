/**
 * POST /api/admin/digital-heirloom/vaults/:vaultId/reset-heartbeat
 * 管理员手动重置心跳
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { canAccessAdmin } from '@/core/rbac/permission';
import {
  findDigitalVaultById,
  updateDigitalVault,
  updateVaultHeartbeat,
  VaultStatus,
} from '@/shared/models/digital-vault';
import { recordHeartbeat } from '@/shared/models/heartbeat-log';
import { logHeartbeatReceivedEvent } from '@/shared/models/dead-man-switch-event';

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

    // 重置心跳
    const updatedVault = await updateVaultHeartbeat(vaultId);

    // 重置状态和邮件计数
    await updateDigitalVault(vaultId, {
      status: VaultStatus.ACTIVE,
      warningEmailCount: 0,
      warningEmailSentAt: null,
      reminderEmailSentAt: null,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    });

    // 记录心跳日志
    await recordHeartbeat(vaultId, vault.userId);

    // 记录事件（标记为管理员操作）
    await logHeartbeatReceivedEvent(vaultId, {
      userId: vault.userId,
      adminId: authResult.user.id,
      adminAction: true,
      timestamp: new Date().toISOString(),
    });

    return respData({
      success: true,
      vaultId,
      lastSeenAt: updatedVault.lastSeenAt,
      message: 'Heartbeat reset successfully by admin',
    });
  } catch (error: any) {
    console.error('Failed to reset heartbeat:', error);
    return respErr(error.message || 'Failed to reset heartbeat');
  }
}
