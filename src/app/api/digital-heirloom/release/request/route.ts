/**
 * POST /api/digital-heirloom/release/request
 * 受益人请求资产释放（使用 Token）
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import {
  validateReleaseToken,
  requestUnlock,
  canUnlockNow,
} from '@/shared/models/beneficiary';
import { findDigitalVaultById } from '@/shared/models/digital-vault';

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    const { releaseToken } = body;

    if (!releaseToken) {
      return respErr('releaseToken is required');
    }

    // 验证 Token
    const tokenValidation = await validateReleaseToken(releaseToken);
    if (!tokenValidation.valid) {
      return respErr(tokenValidation.reason || 'Invalid or expired token');
    }

    const beneficiary = tokenValidation.beneficiary!;

    // 检查延迟解锁机制
    // 如果状态是 notified，需要先请求解锁
    if (beneficiary.status === 'notified') {
      // 请求解锁（设置 24 小时延迟）
      await requestUnlock(beneficiary.id);

      // 获取保险箱信息（用于发送通知给原用户）
      const vault = await findDigitalVaultById(beneficiary.vaultId);
      if (!vault) {
        return respErr('Vault not found');
      }

      // TODO: 发送通知邮件给原用户（在邮件服务中实现）
      // await sendUnlockNotificationEmail(vault.userId, beneficiary);

      return respData({
        message: 'Unlock request submitted. A notification has been sent to the vault owner. Assets will be available after 24 hours.',
        unlockRequestedAt: new Date().toISOString(),
        unlockDelayUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        beneficiaryId: beneficiary.id,
      });
    }

    // 如果状态是 unlock_requested，检查延迟期
    if (beneficiary.status === 'unlock_requested') {
      const unlockCheck = await canUnlockNow(beneficiary.id);
      if (!unlockCheck.canUnlock) {
        return respData({
          message: unlockCheck.reason || 'Delay period not expired',
          remainingHours: unlockCheck.remainingHours,
          unlockDelayUntil: beneficiary.unlockDelayUntil,
        });
      }

      // 延迟期已过，可以获取数据
      const vault = await findDigitalVaultById(beneficiary.vaultId);
      if (!vault) {
        return respErr('Vault not found');
      }

      return respData({
        message: 'Unlock delay period expired. You can now access the encrypted data.',
        vault: {
          id: vault.id,
          encryptedData: vault.encryptedData,
          encryptionSalt: vault.encryptionSalt,
          encryptionIv: vault.encryptionIv,
          encryptionHint: vault.encryptionHint,
        },
        beneficiaryId: beneficiary.id,
      });
    }

    // 如果状态是 released，说明已经释放过了
    if (beneficiary.status === 'released') {
      return respErr('Assets have already been released');
    }

    return respErr('Invalid beneficiary status');
  } catch (error: any) {
    console.error('Request release failed:', error);
    return respErr(error.message || 'Failed to request asset release');
  }
}

