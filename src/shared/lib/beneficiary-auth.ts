/**
 * Beneficiary Authentication Middleware
 * 受益人身份识别中间件
 * 
 * 功能：
 * 1. 验证 Release Token
 * 2. 检查 Token 是否过期
 * 3. 返回受益人上下文信息
 */

import { validateReleaseToken } from '@/shared/models/beneficiary';
import { findDigitalVaultById } from '@/shared/models/digital-vault';
import { getDigitalHeirloomPlanConfig } from '@/shared/config/digital-heirloom-plans';
import { canBeneficiaryDecrypt } from '@/shared/lib/digital-heirloom-plan-limits';

export interface BeneficiaryContext {
  beneficiary: {
    id: string;
    name: string;
    email: string;
    vaultId: string;
    decryptionCount: number;
    decryptionLimit: number | null;
    bonusDecryptionCount: number;
    remainingAttempts: number | null;
    physicalKitMailed: boolean;
    trackingNumber?: string;
  };
  vault: {
    id: string;
    planLevel: 'free' | 'base' | 'pro';
    encryptionHint?: string;
  };
  planConfig: {
    name: string;
    storageLimit: number;
    maxBeneficiaries: number;
    decryptionLimit: number | null;
    physicalShipping: boolean;
    requiresBothFragments: boolean;
  };
}

export interface BeneficiaryAuthResult {
  valid: boolean;
  context?: BeneficiaryContext;
  reason?: string;
}

/**
 * 验证受益人身份并返回上下文信息
 */
export async function authenticateBeneficiary(
  releaseToken: string
): Promise<BeneficiaryAuthResult> {
  try {
    // 1. 验证 Release Token
    const tokenValidation = await validateReleaseToken(releaseToken);
    if (!tokenValidation.valid || !tokenValidation.beneficiary) {
      return {
        valid: false,
        reason: tokenValidation.reason || 'Invalid or expired release token',
      };
    }

    const beneficiary = tokenValidation.beneficiary;
    const vaultId = beneficiary.vaultId;

    // 2. 获取 Vault 信息
    const vault = await findDigitalVaultById(vaultId);
    if (!vault) {
      return {
        valid: false,
        reason: 'Vault not found',
      };
    }

    const planLevel = (vault.planLevel || 'free') as 'free' | 'base' | 'pro';
    const planConfig = getDigitalHeirloomPlanConfig(planLevel);

    // 3. 检查解密权限
    const decryptCheck = await canBeneficiaryDecrypt(beneficiary.id, vaultId);

    // 4. 构建受益人上下文
    const context: BeneficiaryContext = {
      beneficiary: {
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
        vaultId: beneficiary.vaultId,
        decryptionCount: beneficiary.decryptionCount || 0,
        decryptionLimit: beneficiary.decryptionLimit || planConfig.decryptionLimit || 1,
        bonusDecryptionCount: beneficiary.bonusDecryptionCount || 0,
        remainingAttempts: decryptCheck.remainingAttempts ?? null,
        physicalKitMailed: beneficiary.physicalKitMailed || false,
        trackingNumber: beneficiary.trackingNumber || undefined,
      },
      vault: {
        id: vault.id,
        planLevel,
        encryptionHint: vault.encryptionHint || undefined,
      },
      planConfig: {
        name: planConfig.name,
        storageLimit: planConfig.storageLimit,
        maxBeneficiaries: planConfig.maxBeneficiaries,
        decryptionLimit: planConfig.decryptionLimit,
        physicalShipping: planConfig.physicalShipping,
        requiresBothFragments: planConfig.physicalShipping && beneficiary.physicalKitMailed || false,
      },
    };

    return {
      valid: true,
      context,
    };
  } catch (error: any) {
    console.error('Beneficiary authentication failed:', error);
    return {
      valid: false,
      reason: error.message || 'Authentication failed',
    };
  }
}

/**
 * 从请求中提取 Release Token
 * 支持从查询参数、请求头或 Cookie 中获取
 */
export function extractReleaseToken(request: Request): string | null {
  // 1. 从查询参数获取
  const url = new URL(request.url);
  const tokenFromQuery = url.searchParams.get('token') || url.searchParams.get('releaseToken');
  if (tokenFromQuery) {
    return tokenFromQuery;
  }

  // 2. 从请求头获取
  const tokenFromHeader = request.headers.get('x-release-token');
  if (tokenFromHeader) {
    return tokenFromHeader;
  }

  // 3. 从 Cookie 获取（可选）
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const match = cookies.match(/releaseToken=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}
