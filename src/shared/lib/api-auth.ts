/**
 * API 路由认证辅助函数
 * 确保所有 Digital Heirloom API 路由都使用统一的认证检查
 */

import { respErr } from '@/shared/lib/resp';
import { getUserInfo, findUserById } from '@/shared/models/user';
import type { User } from '@/shared/models/user';

/**
 * 验证用户认证并返回用户信息
 * 如果未认证，返回错误响应
 */
export async function requireAuth(): Promise<{ user: User; error?: null } | { user?: null; error: Response }> {
  const sessionUser = await getUserInfo();
  
  if (!sessionUser) {
    return {
      error: respErr('no auth, please sign in', 401),
    };
  }

  // 从数据库获取完整的用户信息（包含 planType, freeTrialUsed, lastCheckinDate 等字段）
  const user = await findUserById(sessionUser.id);
  
  if (!user) {
    return {
      error: respErr('user not found', 404),
    };
  }

  return { user, error: null };
}

/**
 * 验证用户是否拥有指定的保险箱
 */
export async function requireVaultOwnership(
  vaultId: string,
  userId: string
): Promise<{ authorized: boolean; error?: Response }> {
  const { findDigitalVaultByUserId } = await import('@/shared/models/digital-vault');
  
  const vault = await findDigitalVaultByUserId(userId);
  
  if (!vault || vault.id !== vaultId) {
    return {
      authorized: false,
      error: respErr('no permission to access this vault', 403),
    };
  }

  return { authorized: true };
}

/**
 * 组合认证和权限检查
 */
export async function requireAuthAndVaultOwnership(vaultId: string) {
  const authResult = await requireAuth();
  
  if (authResult.error) {
    return authResult;
  }

  const ownershipResult = await requireVaultOwnership(vaultId, authResult.user.id);
  
  if (!ownershipResult.authorized) {
    return {
      user: null,
      error: ownershipResult.error,
    };
  }

  return authResult;
}




