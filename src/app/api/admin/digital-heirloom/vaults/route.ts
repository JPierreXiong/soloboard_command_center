/**
 * GET /api/admin/digital-heirloom/vaults
 * 管理员金库列表接口
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { canAccessAdmin } from '@/core/rbac/permission';
import { db } from '@/core/db';
import { digitalVaults, beneficiaries } from '@/config/db/schema';
import { getUserByUserIds, User } from '@/shared/models/user';
import { eq, and, or, like, sql, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 管理员认证
    const authResult = await requireAuth();
    if (authResult.error) {
      return authResult.error;
    }

    // 检查管理员权限
    const hasAdminAccess = await canAccessAdmin(authResult.user.id);
    if (!hasAdminAccess) {
      return respErr('Admin access required');
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // active | pending_verification | triggered | released
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search'); // 搜索用户邮箱或保险箱ID
    const urgent = searchParams.get('urgent'); // 高风险单据：已逾期但尚未触发

    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions = [];
    if (status) {
      conditions.push(eq(digitalVaults.status, status));
    }
    if (urgent === 'true') {
      // 高风险单据：pending_verification 状态且剩余宽限期 < 48 小时
      conditions.push(eq(digitalVaults.status, 'pending_verification'));
    }
    
    const planFilter = searchParams.get('plan'); // free | base | pro
    if (planFilter) {
      conditions.push(eq(digitalVaults.planLevel, planFilter));
    }
    
    const hoursLeftFilter = searchParams.get('hoursLeft'); // <24 | <48 | <168
    // 注意：hoursLeft 筛选需要在应用层处理，因为需要计算剩余时间
    if (search) {
      // 搜索用户邮箱或保险箱ID（需要通过 JOIN 查询用户邮箱）
      conditions.push(
        or(
          like(digitalVaults.id, `%${search}%`),
          // 用户邮箱需要通过子查询或 JOIN 获取
          sql`${digitalVaults.userId} IN (SELECT id FROM ${sql.identifier('user')} WHERE email LIKE ${`%${search}%`})`
        )
      );
    }

    // 查询总数
    const totalResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(digitalVaults)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = Number(totalResult[0]?.count || 0);

    // 查询保险箱列表
    // 如果是高风险查询，按计划等级和剩余时间排序（Pro 优先，剩余时间少的优先）
    const orderBy = urgent === 'true' 
      ? [desc(digitalVaults.planLevel), sql`${digitalVaults.lastSeenAt} ASC`] // Pro > Base > Free，然后按剩余时间升序
      : [desc(digitalVaults.lastSeenAt)];
    
    const vaults = await db()
      .select()
      .from(digitalVaults)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    // 获取用户信息
    const userIds = [...new Set(vaults.map((v: typeof digitalVaults.$inferSelect) => v.userId))];
    const users: User[] = await getUserByUserIds(userIds as string[]);
    const userMap = new Map(users.map((u: User) => [u.id, u]));

    // 获取每个保险箱的受益人数量和解密进度
    const vaultIds = vaults.map((v: typeof digitalVaults.$inferSelect) => v.id);
    const beneficiariesResult = await db()
      .select({
        vaultId: beneficiaries.vaultId,
        count: sql<number>`count(*)`,
        maxDecryptionCount: sql<number>`max(${beneficiaries.decryptionCount})`,
        maxDecryptionLimit: sql<number>`max(${beneficiaries.decryptionLimit})`,
      })
      .from(beneficiaries)
      .where(
        vaultIds.length > 0
          ? sql`${beneficiaries.vaultId} IN (${sql.join(vaultIds.map((id: string) => sql`${id}`), sql`, `)})`
          : sql`1=0`
      )
      .groupBy(beneficiaries.vaultId);
    
    const beneficiaryCountMap = new Map(
      beneficiariesResult.map((b: { vaultId: string; count: number | null }) => [b.vaultId, Number(b.count || 0)])
    );
    
    const decryptionProgressMap = new Map(
      beneficiariesResult.map((b: { vaultId: string; maxDecryptionCount: number | null; maxDecryptionLimit: number | null }) => [
        b.vaultId,
        {
          used: Number(b.maxDecryptionCount || 0),
          limit: Number(b.maxDecryptionLimit || 1),
        },
      ])
    );

    // 计算每个保险箱的统计信息
    const now = new Date();
    const vaultsWithStats = vaults.map((vault: typeof digitalVaults.$inferSelect) => {
      const user = userMap.get(vault.userId) as User | undefined;
      const beneficiariesCount = beneficiaryCountMap.get(vault.id) || 0;

      // 计算距离上次活跃的天数
      let daysSinceLastSeen = 0;
      if (vault.lastSeenAt) {
        daysSinceLastSeen = Math.floor(
          (now.getTime() - new Date(vault.lastSeenAt).getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // 计算距离触发的时间（如果状态是 pending_verification）
      let daysUntilTrigger: number | null = null;
      let remainingHours: number | null = null;
      if (vault.status === 'pending_verification' && vault.lastSeenAt) {
        const lastSeenDate = new Date(vault.lastSeenAt);
        const heartbeatFrequencyDays = vault.heartbeatFrequency || 90;
        const gracePeriodDays = vault.gracePeriod || 7;

        const deadlineDate = new Date(
          lastSeenDate.getTime() + heartbeatFrequencyDays * 24 * 60 * 60 * 1000
        );
        const gracePeriodEndDate = new Date(
          deadlineDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000
        );

        const millisecondsUntilTrigger = gracePeriodEndDate.getTime() - now.getTime();
        daysUntilTrigger = Math.floor(millisecondsUntilTrigger / (1000 * 60 * 60 * 24));
        remainingHours = Math.floor(millisecondsUntilTrigger / (1000 * 60 * 60));
      }

      // 获取解密进度
      const decryptionProgress = decryptionProgressMap.get(vault.id) || { used: 0, limit: 1 };

      // 应用 hoursLeft 筛选（如果指定）
      let shouldInclude = true;
      if (urgent === 'true' && hoursLeftFilter && remainingHours !== null) {
        const hoursThreshold = hoursLeftFilter === '<24' ? 24 : hoursLeftFilter === '<48' ? 48 : 168;
        shouldInclude = remainingHours >= 0 && remainingHours < hoursThreshold;
      }

      if (!shouldInclude) {
        return null;
      }

      return {
        id: vault.id,
        userId: vault.userId,
        userEmail: user?.email || 'Unknown',
        planLevel: vault.planLevel || 'free',
        status: vault.status,
        lastSeenAt: vault.lastSeenAt,
        heartbeatFrequency: vault.heartbeatFrequency,
        gracePeriod: vault.gracePeriod,
        deadManSwitchEnabled: vault.deadManSwitchEnabled,
        beneficiariesCount,
        decryptionProgress,
        warningEmailSentAt: vault.warningEmailSentAt,
        warningEmailCount: vault.warningEmailCount || 0,
        daysSinceLastSeen,
        daysUntilTrigger,
        remainingHours,
        createdAt: vault.createdAt,
        updatedAt: vault.updatedAt,
      };
    });

    // 过滤掉 null 值（被 hoursLeft 筛选排除的）
    const filteredVaults = vaultsWithStats.filter((v: NonNullable<typeof vaultsWithStats[0]> | null): v is NonNullable<typeof vaultsWithStats[0]> => v !== null);
    
    // 如果是高风险查询，按剩余小时数重新排序
    if (urgent === 'true') {
      filteredVaults.sort((a: NonNullable<typeof vaultsWithStats[0]>, b: NonNullable<typeof vaultsWithStats[0]>) => {
        // Pro 用户优先
        const planPriority = { pro: 3, base: 2, free: 1 };
        const aPriority = planPriority[a.planLevel as keyof typeof planPriority] || 1;
        const bPriority = planPriority[b.planLevel as keyof typeof planPriority] || 1;
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        // 然后按剩余小时数升序（最紧急的在前）
        const aHours = a.remainingHours ?? Infinity;
        const bHours = b.remainingHours ?? Infinity;
        return aHours - bHours;
      });
    }

    return respData({
      vaults: filteredVaults,
      pagination: {
        page,
        limit,
        total: filteredVaults.length, // 使用过滤后的数量
        totalPages: Math.ceil(filteredVaults.length / limit),
      },
    });
  } catch (error: any) {
    console.error('Failed to get admin vaults:', error);
    return respErr(error.message || 'Failed to get admin vaults');
  }
}
