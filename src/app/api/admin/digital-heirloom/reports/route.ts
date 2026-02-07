/**
 * GET /api/admin/digital-heirloom/reports
 * 自定义报表 API
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { canAccessAdmin } from '@/core/rbac/permission';
import { db } from '@/core/db';
import { digitalVaults, beneficiaries, emailNotifications, adminAuditLogs } from '@/config/db/schema';
import { sql, eq, gte, lte, and } from 'drizzle-orm';

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
    const reportType = searchParams.get('type') || 'overview'; // overview | conversion | compensation | activity
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const now = new Date();
    const periodStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = endDate ? new Date(endDate) : now;

    switch (reportType) {
      case 'overview': {
        // 概览报表
        const vaultStats = await db()
          .select({
            planLevel: digitalVaults.planLevel,
            status: digitalVaults.status,
            count: sql<number>`count(*)`,
          })
          .from(digitalVaults)
          .where(
            and(
              gte(digitalVaults.createdAt, periodStart),
              lte(digitalVaults.createdAt, periodEnd)
            )
          )
          .groupBy(digitalVaults.planLevel, digitalVaults.status);

        const planStats: Record<string, Record<string, number>> = {};
        vaultStats.forEach((stat: { planLevel: string | null; status: string | null; count: number | null }) => {
          const plan = stat.planLevel || 'free';
          const status = stat.status || 'active';
          if (!planStats[plan]) {
            planStats[plan] = {};
          }
          planStats[plan][status] = Number(stat.count || 0);
        });

        return respData({
          reportType: 'overview',
          period: {
            start: periodStart.toISOString(),
            end: periodEnd.toISOString(),
          },
          planStats,
        });
      }

      case 'conversion': {
        // 转化报表：Free 用户转化为 Base/Pro 的情况
        const freeVaultsWithDecryption = await db()
          .select({
            vaultId: beneficiaries.vaultId,
            decryptionCount: beneficiaries.decryptionCount,
          })
          .from(beneficiaries)
          .innerJoin(digitalVaults, eq(beneficiaries.vaultId, digitalVaults.id))
          .where(
            and(
              eq(digitalVaults.planLevel, 'free'),
              sql`${beneficiaries.decryptionCount} >= 1`
            )
          );

        const conversionStats = {
          freeUsersWithDecryption: freeVaultsWithDecryption.length,
          potentialConversionValue: freeVaultsWithDecryption.length * 49, // Base plan price
        };

        return respData({
          reportType: 'conversion',
          period: {
            start: periodStart.toISOString(),
            end: periodEnd.toISOString(),
          },
          conversionStats,
        });
      }

      case 'compensation': {
        // 补偿报表：管理员补偿操作统计
        const compensationStats = await db()
          .select({
            actionType: adminAuditLogs.actionType,
            count: sql<number>`count(*)`,
            totalDays: sql<number>`sum((${adminAuditLogs.actionData}->>'days')::int)`,
          })
          .from(adminAuditLogs)
          .where(
            and(
              gte(adminAuditLogs.createdAt, periodStart),
              lte(adminAuditLogs.createdAt, periodEnd),
              sql`${adminAuditLogs.actionType} = 'EXTEND_SUBSCRIPTION'`
            )
          )
          .groupBy(adminAuditLogs.actionType);

        return respData({
          reportType: 'compensation',
          period: {
            start: periodStart.toISOString(),
            end: periodEnd.toISOString(),
          },
          compensationStats: compensationStats.map((stat: { actionType: string; count: number | null; totalDays: number | null }) => ({
            actionType: stat.actionType,
            count: Number(stat.count || 0),
            totalDays: Number(stat.totalDays || 0),
          })),
        });
      }

      case 'activity': {
        // 活动报表：用户活跃度统计
        const activityStats = await db()
          .select({
            date: sql<string>`DATE(${digitalVaults.lastSeenAt})`,
            activeVaults: sql<number>`count(distinct ${digitalVaults.id})`,
          })
          .from(digitalVaults)
          .where(
            and(
              sql`${digitalVaults.lastSeenAt} IS NOT NULL`,
              gte(digitalVaults.lastSeenAt, periodStart),
              lte(digitalVaults.lastSeenAt, periodEnd)
            )
          )
          .groupBy(sql`DATE(${digitalVaults.lastSeenAt})`)
          .orderBy(sql`DATE(${digitalVaults.lastSeenAt})`);

        return respData({
          reportType: 'activity',
          period: {
            start: periodStart.toISOString(),
            end: periodEnd.toISOString(),
          },
          dailyActivity: activityStats.map((stat: { date: string; activeVaults: number | null }) => ({
            date: stat.date,
            activeVaults: Number(stat.activeVaults || 0),
          })),
        });
      }

      default:
        return respErr(`Unknown report type: ${reportType}`);
    }
  } catch (error: any) {
    console.error('Failed to generate report:', error);
    return respErr(error.message || 'Failed to generate report');
  }
}
