/**
 * GET /api/admin/digital-heirloom/alerts
 * 系统报警历史记录查询接口
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { canAccessAdmin } from '@/core/rbac/permission';
import { db } from '@/core/db';
import { systemAlerts, user } from '@/config/db/schema';
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
    const level = searchParams.get('level'); // info | warning | critical
    const type = searchParams.get('type'); // business | resource | cost
    const category = searchParams.get('category');
    const resolved = searchParams.get('resolved'); // true | false
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions = [];
    if (level) {
      conditions.push(eq(systemAlerts.level, level));
    }
    if (type) {
      conditions.push(eq(systemAlerts.type, type));
    }
    if (category) {
      conditions.push(eq(systemAlerts.category, category));
    }
    if (resolved !== null) {
      conditions.push(eq(systemAlerts.resolved, resolved === 'true'));
    }
    if (startDate) {
      conditions.push(gte(systemAlerts.createdAt, new Date(startDate)));
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      conditions.push(lte(systemAlerts.createdAt, endDateTime));
    }

    // 查询总数
    const totalResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(systemAlerts)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = Number(totalResult[0]?.count || 0);

    // 查询报警记录列表
    const alerts = await db()
      .select()
      .from(systemAlerts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(systemAlerts.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取解决人信息
    const resolverIds = [...new Set(alerts.map((alert: typeof systemAlerts.$inferSelect) => alert.resolvedBy).filter(Boolean))];
    const resolvers = resolverIds.length > 0 ? await getUserByUserIds(resolverIds as string[]) : [];
    const resolverMap = new Map(resolvers.map((r: { id: string; name?: string; email?: string }) => [r.id, r]));

    // 格式化报警数据
    const formattedAlerts = alerts.map((alert: typeof systemAlerts.$inferSelect) => {
      const resolver = alert.resolvedBy ? resolverMap.get(alert.resolvedBy) : null;
      return {
        id: alert.id,
        level: alert.level,
        type: alert.type,
        category: alert.category,
        message: alert.message,
        alertData: alert.alertData,
        resolved: alert.resolved,
        resolvedAt: alert.resolvedAt,
        resolvedBy: alert.resolvedBy,
        resolvedByName: (resolver as { name?: string; email?: string })?.name || null,
        resolvedByEmail: (resolver as { name?: string; email?: string })?.email || null,
        resolvedNote: alert.resolvedNote,
        createdAt: alert.createdAt,
      };
    });

    // 统计未解决的报警数量
    const unresolvedCountResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(systemAlerts)
      .where(eq(systemAlerts.resolved, false));
    const unresolvedCount = Number(unresolvedCountResult[0]?.count || 0);

    // 统计各级别的未解决报警数量
    const unresolvedByLevelResult = await db()
      .select({
        level: systemAlerts.level,
        count: sql<number>`count(*)`,
      })
      .from(systemAlerts)
      .where(eq(systemAlerts.resolved, false))
      .groupBy(systemAlerts.level);

    const unresolvedByLevel = {
      critical: 0,
      warning: 0,
      info: 0,
    };
    unresolvedByLevelResult.forEach((row: { level: string; count: number | null }) => {
      const level = row.level as 'critical' | 'warning' | 'info';
      unresolvedByLevel[level] = Number(row.count || 0);
    });

    return respData({
      alerts: formattedAlerts,
      statistics: {
        total,
        unresolved: unresolvedCount,
        unresolvedByLevel,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Failed to get alerts:', error);
    return respErr(error.message || 'Failed to get alerts');
  }
}

/**
 * POST /api/admin/digital-heirloom/alerts
 * 标记报警为已解决
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { alertId, resolved, note } = body;

    if (!alertId) {
      return respErr('Alert ID is required');
    }

    // 更新报警状态
    const [updated] = await db()
      .update(systemAlerts)
      .set({
        resolved: resolved !== false,
        resolvedAt: resolved !== false ? new Date() : null,
        resolvedBy: resolved !== false ? authResult.user.id : null,
        resolvedNote: note || null,
      })
      .where(eq(systemAlerts.id, alertId))
      .returning();

    if (!updated) {
      return respErr('Alert not found');
    }

    return respData({
      alert: updated,
      message: resolved !== false ? '报警已标记为已解决' : '报警已标记为未解决',
    });
  } catch (error: any) {
    console.error('Failed to update alert:', error);
    return respErr(error.message || 'Failed to update alert');
  }
}
