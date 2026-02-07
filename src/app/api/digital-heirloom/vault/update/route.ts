/**
 * PUT /api/digital-heirloom/vault/update
 * 更新数字保险箱数据
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import {
  findDigitalVaultByUserId,
  updateDigitalVault,
} from '@/shared/models/digital-vault';
import { checkHeartbeatFrequency, checkStorageLimit } from '@/shared/lib/digital-heirloom-plan-limits';

export async function PUT(request: NextRequest) {
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

    // 解析请求体
    const body = await request.json();
    const {
      encryptedData,
      encryptionSalt,
      encryptionIv,
      encryptionHint,
      heartbeatFrequency,
      gracePeriod,
      deadManSwitchEnabled,
    } = body;

    // 构建更新对象
    const updateData: any = {};

    // 只更新提供的字段
    if (encryptedData !== undefined) {
      if (!encryptionSalt || !encryptionIv) {
        return respErr('encryptionSalt and encryptionIv are required when updating encryptedData');
      }
      
      // Phase 4.1: 检查存储限制（基于计划等级）
      // 计算加密数据的大小（Base64 编码后的字符串长度）
      const encryptedDataSize = Buffer.byteLength(encryptedData, 'utf8');
      const storageCheck = await checkStorageLimit(vault.id, encryptedDataSize);
      if (!storageCheck.allowed) {
        return respErr(storageCheck.reason || 'Storage limit exceeded');
      }
      
      updateData.encryptedData = encryptedData;
      updateData.encryptionSalt = encryptionSalt;
      updateData.encryptionIv = encryptionIv;
    }

    if (encryptionHint !== undefined) {
      updateData.encryptionHint = encryptionHint;
    }

    if (heartbeatFrequency !== undefined) {
      if (heartbeatFrequency < 1 || heartbeatFrequency > 365) {
        return respErr('heartbeatFrequency must be between 1 and 365 days');
      }
      
      // Phase 4.3: 检查心跳频率限制（基于计划等级）
      const frequencyCheck = await checkHeartbeatFrequency(vault.id, heartbeatFrequency);
      if (!frequencyCheck.allowed) {
        return respErr(frequencyCheck.reason || 'Heartbeat frequency limit exceeded');
      }
      
      updateData.heartbeatFrequency = heartbeatFrequency;
    }

    if (gracePeriod !== undefined) {
      if (gracePeriod < 1 || gracePeriod > 30) {
        return respErr('gracePeriod must be between 1 and 30 days');
      }
      updateData.gracePeriod = gracePeriod;
    }

    if (deadManSwitchEnabled !== undefined) {
      updateData.deadManSwitchEnabled = deadManSwitchEnabled;
      if (deadManSwitchEnabled) {
        updateData.deadManSwitchActivatedAt = new Date();
      } else {
        updateData.deadManSwitchActivatedAt = null;
      }
    }

    // 更新保险箱
    const updatedVault = await updateDigitalVault(vault.id, updateData);

    return respData({
      vault: {
        ...updatedVault,
        encryptedData: undefined, // 不返回加密数据
      },
      message: 'Vault updated successfully',
    });
  } catch (error: any) {
    console.error('Update vault failed:', error);
    return respErr(error.message || 'Failed to update digital vault');
  }
}




