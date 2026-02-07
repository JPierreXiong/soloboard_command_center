/**
 * POST /api/digital-heirloom/release/verify
 * 验证 Token 并获取加密数据（受益人最终提取）
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import {
  validateReleaseToken,
  canUnlockNow,
  markBeneficiaryAsReleased,
} from '@/shared/models/beneficiary';
import { findDigitalVaultById } from '@/shared/models/digital-vault';
import { logAssetsReleasedEvent } from '@/shared/models/dead-man-switch-event';

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    const { releaseToken, emailVerificationCode } = body;

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
    if (beneficiary.status === 'unlock_requested') {
      const unlockCheck = await canUnlockNow(beneficiary.id);
      if (!unlockCheck.canUnlock) {
        return respErr(
          `Delay period not expired. Please wait ${unlockCheck.remainingHours} more hours.`
        );
      }
    } else if (beneficiary.status !== 'notified') {
      return respErr('Invalid beneficiary status for release');
    }

    // TODO: 验证邮箱验证码（如果实现了邮箱验证功能）
    // if (emailVerificationCode) {
    //   const isValid = await verifyEmailCode(beneficiary.email, emailVerificationCode);
    //   if (!isValid) {
    //     return respErr('Invalid email verification code');
    //   }
    // }

    // 获取保险箱数据
    const vault = await findDigitalVaultById(beneficiary.vaultId);
    if (!vault) {
      return respErr('Vault not found');
    }

    // 标记为已释放
    await markBeneficiaryAsReleased(beneficiary.id);

    // 记录事件
    await logAssetsReleasedEvent(beneficiary.vaultId, {
      beneficiaryId: beneficiary.id,
      beneficiaryEmail: beneficiary.email,
      releasedAt: new Date().toISOString(),
    });

    // 返回加密数据（受益人需要使用主密码解密）
    return respData({
      message: 'Assets released successfully. Use the master password to decrypt the data.',
      vault: {
        id: vault.id,
        encryptedData: vault.encryptedData,
        encryptionSalt: vault.encryptionSalt,
        encryptionIv: vault.encryptionIv,
        encryptionHint: vault.encryptionHint,
      },
      beneficiary: {
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
      },
      releasedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Verify release failed:', error);
    return respErr(error.message || 'Failed to verify and release assets');
  }
}




