/**
 * GET /api/digital-heirloom/beneficiaries/list
 * 获取受益人列表
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { findDigitalVaultByUserId } from '@/shared/models/digital-vault';
import { findBeneficiariesByVaultId } from '@/shared/models/beneficiary';

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
        beneficiaries: [],
        message: 'No vault found. Create one first.',
      });
    }

    // 获取受益人列表
    const beneficiaries = await findBeneficiariesByVaultId(vault.id);

    return respData({
      beneficiaries,
      count: beneficiaries.length,
      message: 'Beneficiaries retrieved successfully',
    });
  } catch (error: any) {
    console.error('List beneficiaries failed:', error);
    return respErr(error.message || 'Failed to list beneficiaries');
  }
}




