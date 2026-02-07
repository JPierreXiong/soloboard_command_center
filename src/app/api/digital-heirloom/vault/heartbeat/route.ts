/**
 * POST /api/digital-heirloom/vault/heartbeat
 * 更新心跳时间（用户确认活跃状态）
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import {
  findDigitalVaultByUserId,
  updateVaultHeartbeat,
} from '@/shared/models/digital-vault';
import { recordHeartbeat } from '@/shared/models/heartbeat-log';
import { logHeartbeatReceivedEvent } from '@/shared/models/dead-man-switch-event';

export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const authResult = await requireAuth();
    if (authResult.error) {
      return authResult.error;
    }

    const user = authResult.user;

    // 查找用户的保险箱
    const vault = await findDigitalVaultByUserId(user.id);
    if (!vault) {
      return respErr('Vault not found. Create one first.');
    }

    // 更新心跳时间
    const updatedVault = await updateVaultHeartbeat(vault.id);

    // 记录心跳日志
    await recordHeartbeat(vault.id, user.id);

    // 记录事件
    await logHeartbeatReceivedEvent(vault.id, {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    return respData({
      vault: {
        ...updatedVault,
        encryptedData: undefined,
      },
      message: 'Heartbeat updated successfully',
      lastSeenAt: updatedVault.lastSeenAt,
    });
  } catch (error: any) {
    console.error('Update heartbeat failed:', error);
    return respErr(error.message || 'Failed to update heartbeat');
  }
}

