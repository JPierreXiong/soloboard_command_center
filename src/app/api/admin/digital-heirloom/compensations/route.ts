/**
 * GET /api/admin/digital-heirloom/compensations
 * 管理员补偿审计日志查询接口
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { canAccessAdmin } from '@/core/rbac/permission';
import { db } from '@/core/db';
import { adminAuditLogs, user } from '@/config/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { getUserByUserIds } from '@/shared/models/user';

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
    const adminId = searchParams.get('adminId'); // 按管理员筛选
    const actionType = searchParams.get('actionType'); // 按操作类型筛选
    const vaultId = searchParams.get('vaultId'); // 按金库筛选
    const startDate = searchParams.get('startDate'); // 开始日期
    const endDate = searchParams.get('endDate'); // 结束日期
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions = [];
    if (adminId) {
      conditions.push(eq(adminAuditLogs.adminId, adminId));
    }
    if (actionType) {
      conditions.push(eq(adminAuditLogs.actionType, actionType));
    }
    if (vaultId) {
      conditions.push(eq(adminAuditLogs.vaultId, vaultId));
    }
    if (startDate) {
      conditions.push(gte(adminAuditLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      conditions.push(lte(adminAuditLogs.createdAt, endDateTime));
    }

    // 查询总数
    const totalResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(adminAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = Number(totalResult[0]?.count || 0);

    // 查询审计日志列表
    const logs = await db()
      .select()
      .from(adminAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取管理员信息
    const adminIds = [...new Set(logs.map((log: typeof adminAuditLogs.$inferSelect) => log.adminId))];
    const admins = await getUserByUserIds(adminIds as string[]);
    const adminMap = new Map(admins.map((a: { id: string; name?: string; email?: string }) => [a.id, a]));

    // 格式化日志数据
    const formattedLogs = logs.map((log: typeof adminAuditLogs.$inferSelect) => {
      const admin = adminMap.get(log.adminId) as { id: string; name?: string; email?: string } | undefined;
      return {
        id: log.id,
        adminId: log.adminId,
        adminEmail: admin?.email || 'Unknown',
        adminName: admin?.name || 'Unknown',
        actionType: log.actionType,
        vaultId: log.vaultId,
        beneficiaryId: log.beneficiaryId,
        actionData: log.actionData,
        reason: log.reason,
        beforeState: log.beforeState,
        afterState: log.afterState,
        createdAt: log.createdAt,
      };
    });

    return respData({
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Failed to get compensation logs:', error);
    return respErr(error.message || 'Failed to get compensation logs');
  }
}
