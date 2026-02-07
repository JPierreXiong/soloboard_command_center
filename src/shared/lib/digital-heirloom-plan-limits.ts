/**
 * Digital Heirloom Plan Limits Utility
 * 计划限制检查工具函数
 */

import { db } from '@/core/db';
import { digitalVaults, beneficiaries } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { getDigitalHeirloomPlanConfig } from '@/shared/config/digital-heirloom-plans';
import { findBeneficiaryById } from '@/shared/models/beneficiary';
import { findDigitalVaultById } from '@/shared/models/digital-vault';

/**
 * 获取 Vault 的计划等级
 */
export async function getVaultPlanLevel(vaultId: string): Promise<'free' | 'base' | 'pro'> {
  const vault = await findDigitalVaultById(vaultId);
  if (!vault) {
    return 'free'; // 默认返回 free
  }

  const planLevel = (vault.planLevel || 'free') as 'free' | 'base' | 'pro';
  return planLevel;
}

/**
 * 检查存储限制
 */
export async function checkStorageLimit(
  vaultId: string,
  fileSize: number
): Promise<{
  allowed: boolean;
  reason?: string;
  limit?: number;
  currentSize?: number;
}> {
  const planLevel = await getVaultPlanLevel(vaultId);
  const planConfig = getDigitalHeirloomPlanConfig(planLevel);

  // TODO: 计算当前 Vault 的总存储大小
  // 这里暂时只检查单个文件大小
  if (fileSize > planConfig.storageLimit) {
    return {
      allowed: false,
      reason: `File size exceeds ${planConfig.name} plan limit (${formatStorageLimit(planConfig.storageLimit)})`,
      limit: planConfig.storageLimit,
      currentSize: fileSize,
    };
  }

  return {
    allowed: true,
    limit: planConfig.storageLimit,
    currentSize: fileSize,
  };
}

/**
 * 检查受益人数量限制
 */
export async function checkBeneficiaryLimit(
  vaultId: string
): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  maxCount?: number;
}> {
  const planLevel = await getVaultPlanLevel(vaultId);
  const planConfig = getDigitalHeirloomPlanConfig(planLevel);

  // 获取当前受益人数量
  const currentBeneficiaries = await db()
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.vaultId, vaultId));

  const currentCount = currentBeneficiaries.length;

  if (currentCount >= planConfig.maxBeneficiaries) {
    return {
      allowed: false,
      reason: `Beneficiary limit reached. ${planConfig.name} plan supports up to ${planConfig.maxBeneficiaries} beneficiary(ies).`,
      currentCount,
      maxCount: planConfig.maxBeneficiaries,
    };
  }

  return {
    allowed: true,
    currentCount,
    maxCount: planConfig.maxBeneficiaries,
  };
}

/**
 * 检查心跳频率限制
 */
export async function checkHeartbeatFrequency(
  vaultId: string,
  frequency: number
): Promise<{
  allowed: boolean;
  reason?: string;
  min?: number;
  max?: number;
}> {
  const planLevel = await getVaultPlanLevel(vaultId);
  const planConfig = getDigitalHeirloomPlanConfig(planLevel);

  if (frequency < planConfig.heartbeatFrequency.min || frequency > planConfig.heartbeatFrequency.max) {
    return {
      allowed: false,
      reason: `Heartbeat frequency must be between ${planConfig.heartbeatFrequency.min} and ${planConfig.heartbeatFrequency.max} days for ${planConfig.name} plan.`,
      min: planConfig.heartbeatFrequency.min,
      max: planConfig.heartbeatFrequency.max,
    };
  }

  return {
    allowed: true,
    min: planConfig.heartbeatFrequency.min,
    max: planConfig.heartbeatFrequency.max,
  };
}

/**
 * 检查受益人是否可以解密（包含管理员赠送次数）
 */
export async function canBeneficiaryDecrypt(
  beneficiaryId: string,
  vaultId: string
): Promise<{
  canDecrypt: boolean;
  reason?: string;
  remainingAttempts?: number | null;
  totalLimit?: number | null;
}> {
  const beneficiary = await findBeneficiaryById(beneficiaryId);
  if (!beneficiary) {
    return { canDecrypt: false, reason: 'Beneficiary not found' };
  }

  const vault = await findDigitalVaultById(vaultId);
  if (!vault) {
    return { canDecrypt: false, reason: 'Vault not found' };
  }

  const planLevel = (vault.planLevel || 'free') as 'free' | 'base' | 'pro';
  const planConfig = getDigitalHeirloomPlanConfig(planLevel);

  // 计算总限制（默认限制 + 管理员赠送次数）
  const defaultLimit = planConfig.decryptionLimit;
  const bonusCount = beneficiary.bonusDecryptionCount || 0;
  
  // 如果 defaultLimit 是 null（无限制），则总限制也是 null
  const totalLimit = defaultLimit === null ? null : (defaultLimit + bonusCount);

  // 检查解密次数限制
  if (totalLimit !== null) {
    const currentCount = beneficiary.decryptionCount || 0;
    if (currentCount >= totalLimit) {
      return {
        canDecrypt: false,
        reason: 'Decryption limit reached. Please upgrade to Base or Pro plan.',
        remainingAttempts: 0,
        totalLimit,
      };
    }

    return {
      canDecrypt: true,
      remainingAttempts: totalLimit - currentCount,
      totalLimit,
    };
  }

  // 无限制（Base/Pro 用户）
  return {
    canDecrypt: true,
    remainingAttempts: null, // null = unlimited
    totalLimit: null,
  };
}

/**
 * 格式化存储限制显示
 */
function formatStorageLimit(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
