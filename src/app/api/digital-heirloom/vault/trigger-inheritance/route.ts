/**
 * POST /api/digital-heirloom/vault/trigger-inheritance
 * 测试用 API：手动触发 Dead Man's Switch（继承流程）
 * 
 * ⚠️ 仅用于测试环境，生产环境应禁用或添加额外权限检查
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { findDigitalVaultByUserId, updateDigitalVault, VaultStatus } from '@/shared/models/digital-vault';
import { findBeneficiariesByVaultId, Beneficiary } from '@/shared/models/beneficiary';
import { logSwitchActivatedEvent } from '@/shared/models/dead-man-switch-event';

export async function POST(request: NextRequest) {
  try {
    // 1. 认证检查
    const authResult = await requireAuth();
    if (authResult.error) {
      return authResult.error;
    }

    const user = authResult.user;

    // 2. 获取用户的保险箱
    const vault = await findDigitalVaultByUserId(user.id);
    if (!vault) {
      return respErr('Vault not found. Please create a vault first.', 404);
    }

    // 3. 检查是否已经触发
    if (vault.status === VaultStatus.ACTIVATED || vault.status === VaultStatus.RELEASED) {
      return respErr('Inheritance process has already been triggered.', 400);
    }

    // 4. 获取受益人列表
    const beneficiaries = await findBeneficiariesByVaultId(vault.id);
    if (beneficiaries.length === 0) {
      return respErr('No beneficiaries found. Please add beneficiaries first.', 400);
    }

    // 5. 更新 Vault 状态为 ACTIVATED
    const updatedVault = await updateDigitalVault(vault.id, {
      status: VaultStatus.ACTIVATED,
      deadManSwitchActivatedAt: new Date(),
    });

    // 6. 记录事件
    await logSwitchActivatedEvent(vault.id, {
      triggeredAt: new Date().toISOString(),
      triggeredBy: 'manual_test',
    });

    // 7. TODO: 发送通知给受益人（在实际生产环境中实现）
    // for (const beneficiary of beneficiaries) {
    //   await sendInheritanceNotificationEmail(beneficiary);
    // }

    return respData({
      vault: updatedVault,
      beneficiaries: beneficiaries.map((b: Beneficiary) => ({
        id: b.id,
        name: b.name,
        email: b.email,
        releaseToken: b.releaseToken,
        status: b.status,
      })),
      message: 'Dead Man\'s Switch triggered successfully. Beneficiaries will be notified.',
      triggeredAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Trigger inheritance failed:', error);
    return respErr(error.message || 'Failed to trigger inheritance');
  }
}
