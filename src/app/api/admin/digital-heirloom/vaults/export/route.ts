/**
 * GET /api/admin/digital-heirloom/vaults/export
 * 导出金库数据为 CSV（Super Admin）
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { canAccessAdmin } from '@/core/rbac/permission';
import { db } from '@/core/db';
import { digitalVaults, beneficiaries } from '@/config/db/schema';
import { getUserByUserIds } from '@/shared/models/user';
import { eq, and, or, like, sql, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 管理员认证
    const authResult = await requireAuth();
    if (authResult.error) {
      return authResult.error;
    }

    // 检查管理员权限（需要 Super Admin）
    const hasAdminAccess = await canAccessAdmin(authResult.user.id);
    if (!hasAdminAccess) {
      return respErr('Admin access required');
    }

    // 解析查询参数（与列表 API 相同的筛选条件）
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const planLevel = searchParams.get('plan');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '10000', 10); // 最多导出 10000 条

    // 构建查询条件（与列表 API 相同）
    const conditions = [];
    if (status) {
      conditions.push(eq(digitalVaults.status, status));
    }
    if (planLevel) {
      conditions.push(eq(digitalVaults.planLevel, planLevel));
    }
    if (search) {
      conditions.push(
        or(
          like(digitalVaults.id, `%${search}%`),
          sql`${digitalVaults.userId} IN (SELECT id FROM ${sql.identifier('user')} WHERE email LIKE ${`%${search}%`})`
        )
      );
    }
    if (startDate) {
      conditions.push(sql`${digitalVaults.createdAt} >= ${new Date(startDate)}`);
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      conditions.push(sql`${digitalVaults.createdAt} <= ${endDateTime}`);
    }

    // 查询金库数据
    const vaults = await db()
      .select()
      .from(digitalVaults)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(digitalVaults.createdAt))
      .limit(limit);

    // 获取用户信息
    const userIds = [...new Set(vaults.map((v: typeof digitalVaults.$inferSelect) => v.userId))];
    const users = await getUserByUserIds(userIds as string[]);
    const userMap = new Map(users.map((u: { id: string; email?: string }) => [u.id, u]));

    // 获取每个金库的受益人数量
    const vaultIds = vaults.map((v: typeof digitalVaults.$inferSelect) => v.id);
    const beneficiariesResult = await db()
      .select({
        vaultId: beneficiaries.vaultId,
        count: sql<number>`count(*)`,
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

    // 格式化 CSV 数据
    const csvRows = [];
    
    // CSV 表头
    csvRows.push([
      'Vault ID',
      'User Email',
      'Plan Level',
      'Status',
      'Beneficiaries Count',
      'Heartbeat Frequency (days)',
      'Grace Period (days)',
      'Current Period End',
      'Bonus Days',
      'Last Seen At',
      'Created At',
      'Updated At',
    ].join(','));

    // CSV 数据行
    for (const vault of vaults) {
      const user = userMap.get(vault.userId) as { id: string; email?: string } | undefined;
      const beneficiariesCount = beneficiaryCountMap.get(vault.id) || 0;

      const row = [
        vault.id,
        user?.email || 'Unknown',
        vault.planLevel || 'free',
        vault.status,
        beneficiariesCount,
        vault.heartbeatFrequency || 0,
        vault.gracePeriod || 0,
        vault.currentPeriodEnd ? new Date(vault.currentPeriodEnd).toISOString() : '',
        vault.bonusDays || 0,
        vault.lastSeenAt ? new Date(vault.lastSeenAt).toISOString() : '',
        vault.createdAt ? new Date(vault.createdAt).toISOString() : '',
        vault.updatedAt ? new Date(vault.updatedAt).toISOString() : '',
      ].map(field => {
        // 转义 CSV 字段（处理逗号、引号、换行符）
        const str = String(field || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');

      csvRows.push(row);
    }

    const csvContent = csvRows.join('\n');

    // 返回 CSV 文件
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="digital-heirloom-vaults-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export vaults failed:', error);
    return respErr(error.message || 'Failed to export vaults');
  }
}
