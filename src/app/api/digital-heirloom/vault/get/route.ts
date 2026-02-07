/**
 * GET /api/digital-heirloom/vault/get
 * 获取用户的数字保险箱
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { findDigitalVaultByUserId } from '@/shared/models/digital-vault';
import { findBeneficiariesByVaultId } from '@/shared/models/beneficiary';
import { getLatestHeartbeatLog } from '@/shared/models/heartbeat-log';
import { findEventsByVaultId } from '@/shared/models/dead-man-switch-event';

export async function GET(request: NextRequest) {
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
      return respData({
        vault: null,
        message: 'No vault found. Create one first.',
      });
    }

    // 获取相关数据
    const beneficiaries = await findBeneficiariesByVaultId(vault.id);
    const latestHeartbeat = await getLatestHeartbeatLog(vault.id);
    const recentEvents = await findEventsByVaultId(vault.id, 10);

    return respData({
      vault: {
        ...vault,
        // 不返回加密数据本身，只返回元数据
        encryptedData: undefined,
      },
      beneficiaries,
      latestHeartbeat,
      recentEvents,
      message: 'Vault retrieved successfully',
    });
  } catch (error: any) {
    console.error('Get vault failed:', error);
    return respErr(error.message || 'Failed to get digital vault');
  }
}




