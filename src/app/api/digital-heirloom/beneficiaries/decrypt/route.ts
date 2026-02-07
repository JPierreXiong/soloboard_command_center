/**
 * POST /api/digital-heirloom/beneficiaries/decrypt
 * 受益人解密 API（支持 Fragment A/B）
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import {
  validateReleaseToken,
  markBeneficiaryAsReleased,
} from '@/shared/models/beneficiary';
import { findDigitalVaultById } from '@/shared/models/digital-vault';
import { canBeneficiaryDecrypt } from '@/shared/lib/digital-heirloom-plan-limits';
import { mergeFragments } from '@/shared/lib/fragment-merger';
import { recoverMasterPasswordFromKit } from '@/shared/lib/recovery-kit';
import { decryptData } from '@/shared/lib/encryption';
import { db } from '@/core/db';
import { beneficiaries } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      releaseToken,
      fragmentA, // Fragment A 助记词数组（12个单词）
      fragmentB, // Fragment B 助记词数组（12个单词，可选）
      mnemonic, // 完整助记词（24个单词，如果提供了 fragmentA 和 fragmentB，则忽略）
      masterPassword, // 主密码（如果提供了助记词，则忽略）
    } = body;

    // 验证必需参数
    if (!releaseToken) {
      return respErr('releaseToken is required');
    }

    // 验证 Release Token
    const tokenValidation = await validateReleaseToken(releaseToken);
    if (!tokenValidation.valid) {
      return respErr(tokenValidation.reason || 'Invalid or expired token');
    }

    const beneficiary = tokenValidation.beneficiary!;
    const vaultId = beneficiary.vaultId;

    // 检查解密次数限制
    const decryptCheck = await canBeneficiaryDecrypt(beneficiary.id, vaultId);
    if (!decryptCheck.canDecrypt) {
      return respErr(decryptCheck.reason || 'Decryption limit reached');
    }

    // 获取 Vault 信息
    const vault = await findDigitalVaultById(vaultId);
    if (!vault) {
      return respErr('Vault not found');
    }

    // 确定解密方式：Fragment A/B 或完整助记词或主密码
    let masterPasswordToUse: string;

    if (fragmentA && fragmentB) {
      // 使用 Fragment A + B
      const merged = mergeFragments(fragmentA, fragmentB);
      if (!merged.valid) {
        return respErr(`Fragment merge failed: ${merged.errors.join(', ')}`);
      }

      // 使用合并后的助记词恢复主密码
      if (!vault.recoveryBackupToken || !vault.recoveryBackupSalt || !vault.recoveryBackupIv) {
        return respErr('Recovery kit data not found in vault');
      }

      masterPasswordToUse = await recoverMasterPasswordFromKit(
        merged.mnemonic.join(' '),
        vault.recoveryBackupToken,
        vault.recoveryBackupSalt,
        vault.recoveryBackupIv
      );
    } else if (mnemonic) {
      // 使用完整助记词
      if (!vault.recoveryBackupToken || !vault.recoveryBackupSalt || !vault.recoveryBackupIv) {
        return respErr('Recovery kit data not found in vault');
      }

      masterPasswordToUse = await recoverMasterPasswordFromKit(
        Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic,
        vault.recoveryBackupToken,
        vault.recoveryBackupSalt,
        vault.recoveryBackupIv
      );
    } else if (masterPassword) {
      // 直接使用主密码
      masterPasswordToUse = masterPassword;
    } else {
      return respErr('Either fragmentA+fragmentB, mnemonic, or masterPassword is required');
    }

    // 解密数据
    if (!vault.encryptedData || !vault.encryptionSalt || !vault.encryptionIv) {
      return respErr('Encrypted data not found in vault');
    }

    const decryptedData = await decryptData(
      vault.encryptedData,
      masterPasswordToUse,
      vault.encryptionSalt,
      vault.encryptionIv
    );

    // 解析解密后的 JSON 数据
    let decryptedContent: any;
    try {
      decryptedContent = JSON.parse(decryptedData);
    } catch {
      // 如果不是 JSON，返回原始文本
      decryptedContent = { raw: decryptedData };
    }

    // 更新解密次数和记录
    const currentCount = beneficiary.decryptionCount || 0;
    const decryptionHistory = (beneficiary.decryptionHistory as any[]) || [];
    
    // 获取客户端 IP
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // 添加解密记录
    decryptionHistory.push({
      at: new Date().toISOString(),
      ip: clientIp,
      success: true,
      token: releaseToken.substring(0, 8) + '...', // 只记录部分 Token
      fragmentAProvided: !!fragmentA,
      fragmentBProvided: !!fragmentB,
    });

    // 更新受益人记录
    await db()
      .update(beneficiaries)
      .set({
        decryptionCount: currentCount + 1,
        lastDecryptionAt: new Date(),
        decryptionHistory: decryptionHistory,
        status: 'released', // 标记为已释放
      })
      .where(eq(beneficiaries.id, beneficiary.id));

    // 标记为已释放（如果还没有）
    if (beneficiary.status !== 'released') {
      await markBeneficiaryAsReleased(beneficiary.id);
    }

    // 检查是否是 Free 用户且解密次数已用完
    const planLevel = (vault.planLevel || 'free') as 'free' | 'base' | 'pro';
    const planConfig = await import('@/shared/config/digital-heirloom-plans').then(m => 
      m.getDigitalHeirloomPlanConfig(planLevel)
    );
    
    const totalLimit = planConfig.decryptionLimit === null 
      ? null 
      : (planConfig.decryptionLimit + (beneficiary.bonusDecryptionCount || 0));
    
    const isLimitReached = totalLimit !== null && (currentCount + 1) >= totalLimit;

    return respData({
      success: true,
      message: 'Assets decrypted successfully',
      data: decryptedContent,
      vault: {
        id: vault.id,
        planLevel,
        encryptionHint: vault.encryptionHint,
      },
      beneficiary: {
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
      },
      decryptionInfo: {
        count: currentCount + 1,
        limit: totalLimit,
        remainingAttempts: totalLimit !== null ? totalLimit - (currentCount + 1) : null,
        isLimitReached,
        shouldUpgrade: isLimitReached && planLevel === 'free',
      },
      decryptedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Decrypt failed:', error);
    
    // 记录失败的解密尝试
    try {
      const body = await request.json();
      const { releaseToken, fragmentA, fragmentB } = body;
      
      if (releaseToken) {
        const tokenValidation = await validateReleaseToken(releaseToken);
        if (tokenValidation.valid && tokenValidation.beneficiary) {
          const beneficiary = tokenValidation.beneficiary;
          const decryptionHistory = (beneficiary.decryptionHistory as any[]) || [];
          const clientIp = request.headers.get('x-forwarded-for') || 
                           request.headers.get('x-real-ip') || 
                           'unknown';

          decryptionHistory.push({
            at: new Date().toISOString(),
            ip: clientIp,
            success: false,
            token: releaseToken.substring(0, 8) + '...',
            fragmentAProvided: !!fragmentA,
            fragmentBProvided: !!fragmentB,
            error: error.message,
          });

          await db()
            .update(beneficiaries)
            .set({ decryptionHistory })
            .where(eq(beneficiaries.id, beneficiary.id));
        }
      }
    } catch (logError) {
      console.error('Failed to log decryption attempt:', logError);
    }

    return respErr(error.message || 'Failed to decrypt assets');
  }
}
