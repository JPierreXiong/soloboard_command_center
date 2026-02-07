/**
 * DELETE /api/digital-heirloom/beneficiaries/remove
 * 删除受益人
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { findDigitalVaultByUserId } from '@/shared/models/digital-vault';
import {
  findBeneficiaryById,
  deleteBeneficiary,
} from '@/shared/models/beneficiary';

export async function DELETE(request: NextRequest) {
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
    const { beneficiaryId } = body;

    if (!beneficiaryId) {
      return respErr('beneficiaryId is required');
    }

    // 验证受益人属于该保险箱
    const beneficiary = await findBeneficiaryById(beneficiaryId);
    if (!beneficiary) {
      return respErr('Beneficiary not found');
    }

    if (beneficiary.vaultId !== vault.id) {
      return respErr('No permission to delete this beneficiary');
    }

    // 检查状态：如果已释放，不允许删除
    if (beneficiary.status === 'released') {
      return respErr('Cannot delete a beneficiary whose assets have been released');
    }

    // 删除受益人
    await deleteBeneficiary(beneficiaryId);

    return respData({
      message: 'Beneficiary deleted successfully',
    });
  } catch (error: any) {
    console.error('Remove beneficiary failed:', error);
    return respErr(error.message || 'Failed to remove beneficiary');
  }
}




