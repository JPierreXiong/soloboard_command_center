/**
 * GET /api/digital-heirloom/beneficiaries/inheritance-center
 * 获取受益人可访问的遗产信息
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { validateReleaseToken } from '@/shared/models/beneficiary';
import { findDigitalVaultById } from '@/shared/models/digital-vault';
import { getDigitalHeirloomPlanConfig } from '@/shared/config/digital-heirloom-plans';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const releaseToken = searchParams.get('releaseToken');

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

    // 获取 Vault 信息
    const vault = await findDigitalVaultById(vaultId);
    if (!vault) {
      return respErr('Vault not found');
    }

    const planLevel = (vault.planLevel || 'free') as 'free' | 'base' | 'pro';
    const planConfig = getDigitalHeirloomPlanConfig(planLevel);

    return respData({
      vault: {
        id: vault.id,
        planLevel,
        encryptionHint: vault.encryptionHint,
        physicalShippingEnabled: planConfig.physicalShipping,
        requiresBothFragments: planConfig.physicalShipping && beneficiary.physicalKitMailed,
      },
      beneficiary: {
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
        decryptionCount: beneficiary.decryptionCount || 0,
        decryptionLimit: beneficiary.decryptionLimit || 1,
        bonusDecryptionCount: beneficiary.bonusDecryptionCount || 0,
        physicalKitMailed: beneficiary.physicalKitMailed || false,
        trackingNumber: beneficiary.trackingNumber,
      },
      planConfig: {
        name: planConfig.name,
        storageLimit: planConfig.storageLimit,
        maxBeneficiaries: planConfig.maxBeneficiaries,
        decryptionLimit: planConfig.decryptionLimit,
        physicalShipping: planConfig.physicalShipping,
      },
    });
  } catch (error: any) {
    console.error('Get inheritance center info failed:', error);
    return respErr(error.message || 'Failed to get inheritance center information');
  }
}
