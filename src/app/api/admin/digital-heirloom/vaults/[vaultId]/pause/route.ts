/**
 * POST /api/admin/digital-heirloom/vaults/:vaultId/pause
 * 管理员暂停 Dead Man's Switch
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { canAccessAdmin } from '@/core/rbac/permission';
import { findDigitalVaultById, updateDigitalVault } from '@/shared/models/digital-vault';
import { logSwitchDeactivatedEvent } from '@/shared/models/dead-man-switch-event';

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
    const { reason } = body;

    // 查找保险箱
    const vault = await findDigitalVaultById(vaultId);
    if (!vault) {
      return respErr('Vault not found');
    }

    // 暂停 Dead Man's Switch
    await updateDigitalVault(vaultId, {
      deadManSwitchEnabled: false,
    });

    // 记录事件
    await logSwitchDeactivatedEvent(vaultId, {
      userId: vault.userId,
      adminId: authResult.user.id,
      reason: reason || 'Admin paused',
      timestamp: new Date().toISOString(),
    });

    return respData({
      success: true,
      vaultId,
      deadManSwitchEnabled: false,
      message: 'Dead Man\'s Switch paused successfully',
    });
  } catch (error: any) {
    console.error('Failed to pause Dead Man\'s Switch:', error);
    return respErr(error.message || 'Failed to pause Dead Man\'s Switch');
  }
}
