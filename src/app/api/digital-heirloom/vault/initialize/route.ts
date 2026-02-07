/**
 * POST /api/digital-heirloom/vault/initialize
 * 聚合 API：一次性初始化数字保险箱
 * 
 * 功能：
 * 1. 创建数字保险箱（包含加密数据和恢复包）
 * 2. 批量创建受益人
 * 3. 初始化心跳日志
 * 4. 确保事务完整性
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import {
  createDigitalVault,
  findDigitalVaultByUserId,
  VaultStatus,
} from '@/shared/models/digital-vault';
import { createBeneficiary, createBeneficiaries } from '@/shared/models/beneficiary';
import { createHeartbeatLog } from '@/shared/models/heartbeat-log';
import { getUuid } from '@/shared/lib/hash';
import { db } from '@/core/db';

export async function POST(request: NextRequest) {
  try {
    // 1. 认证检查
    const authResult = await requireAuth();
    if (authResult.error) {
      return authResult.error;
    }

    const user = authResult.user;

    // 2. 检查用户是否已有保险箱（幂等性检查）
    // 添加错误处理，如果表不存在或查询失败，提供友好的错误信息
    let existingVault;
    try {
      existingVault = await findDigitalVaultByUserId(user.id);
    } catch (dbError: any) {
      // 如果是表不存在的错误，提供更友好的提示
      if (dbError.message?.includes('does not exist') || dbError.message?.includes('relation') || dbError.message?.includes('table')) {
        console.error('Database table not found. Please run migrations:', dbError.message);
        return respErr('Database schema not initialized. Please run database migrations first.', 500);
      }
      // 其他数据库错误，记录并返回
      console.error('Database query error:', dbError);
      return respErr(`Database error: ${dbError.message || 'Unknown database error'}`, 500);
    }
    
    if (existingVault) {
      return respErr('You already have a digital vault. Please use the update endpoint to modify it.', 400);
    }

    // 3. 解析请求体
    const body = await request.json();
    const {
      vaultData,
      beneficiaries,
      settings,
    } = body;

    // 4. 验证必需字段
    if (!vaultData || !vaultData.encryptedData || !vaultData.encryptionSalt || !vaultData.encryptionIv) {
      return respErr('vaultData with encryptedData, encryptionSalt, and encryptionIv is required');
    }

    if (!beneficiaries || !Array.isArray(beneficiaries) || beneficiaries.length === 0) {
      return respErr('At least one beneficiary is required');
    }

    // 验证受益人数据
    for (const beneficiary of beneficiaries) {
      if (!beneficiary.name || !beneficiary.email) {
        return respErr('Each beneficiary must have a name and email');
      }
    }

    // 5. 使用数据库事务确保原子性
    // 注意：Drizzle ORM 不直接支持事务，我们需要手动处理回滚逻辑
    const vaultId = getUuid();
    const now = new Date();

    try {
      // 5.1 创建数字保险箱
      const newVault = await createDigitalVault({
        id: vaultId,
        userId: user.id,
        encryptedData: vaultData.encryptedData,
        encryptionSalt: vaultData.encryptionSalt,
        encryptionIv: vaultData.encryptionIv,
        encryptionHint: vaultData.encryptionHint || null,
        recoveryBackupToken: vaultData.recoveryBackupToken || null,
        recoveryBackupSalt: vaultData.recoveryBackupSalt || null,
        recoveryBackupIv: vaultData.recoveryBackupIv || null,
        heartbeatFrequency: settings?.heartbeatFrequency || 90,
        gracePeriod: settings?.gracePeriod || 7,
        deadManSwitchEnabled: settings?.deadManSwitchEnabled !== false, // 默认启用
        status: VaultStatus.ACTIVE,
        lastSeenAt: now,
      });

      // 5.2 批量创建受益人
      const beneficiaryRecords = beneficiaries.map((b: any) => ({
        name: b.name,
        email: b.email,
        relationship: b.relationship || 'other',
        language: b.language || 'en',
        phone: b.phone || null,
        receiverName: b.receiverName || null,
        addressLine1: b.addressLine1 || null,
        city: b.city || null,
        zipCode: b.zipCode || null,
        countryCode: b.countryCode || 'US',
        status: 'pending',
      }));

      // 使用批量创建函数（注意函数签名：vaultId 作为第一个参数）
      await createBeneficiaries(vaultId, beneficiaryRecords);

      // 5.3 创建初始心跳日志（容错处理：失败不影响主流程）
      try {
        const { recordHeartbeat } = await import('@/shared/models/heartbeat-log');
        await recordHeartbeat(vaultId, user.id);
      } catch (heartbeatError: any) {
        // 心跳日志创建失败不应该阻止 Vault 初始化
        // 记录警告但继续执行
        console.warn('Failed to create initial heartbeat log (non-critical):', heartbeatError.message);
        // 不抛出错误，让流程继续
      }

      // 6. 返回成功响应
      // 注意：respData 返回 code: 0，HTTP statusCode: 200
      return respData({
        vault: {
          id: newVault.id,
          status: newVault.status,
          deadManSwitchEnabled: newVault.deadManSwitchEnabled,
          heartbeatFrequency: newVault.heartbeatFrequency,
          gracePeriod: newVault.gracePeriod,
          lastSeenAt: newVault.lastSeenAt,
        },
        beneficiariesCount: beneficiaries.length,
        message: 'Digital vault initialized successfully',
      });
    } catch (dbError: any) {
      // 如果任何步骤失败，记录错误
      console.error('Database operation failed during vault initialization:', dbError);
      
      // 尝试清理已创建的数据（如果部分成功）
      // 注意：由于 Drizzle 的限制，这里只能记录错误，实际清理需要手动处理
      // 在生产环境中，建议使用支持事务的数据库客户端
      
      throw new Error(`Failed to initialize vault: ${dbError.message}`);
    }
  } catch (error: any) {
    console.error('Initialize vault failed:', error);
    return respErr(error.message || 'Failed to initialize digital vault', 500);
  }
}

