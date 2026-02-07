/**
 * GET /api/admin/digital-heirloom/costs
 * 成本监控接口
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { canAccessAdmin } from '@/core/rbac/permission';
import { db } from '@/core/db';
import { digitalVaults, emailNotifications, shippingLogs } from '@/config/db/schema';
import { eq, and, gte, lte, sql, between } from 'drizzle-orm';

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
    const period = searchParams.get('period') || 'month'; // day | week | month
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    // 根据 period 计算时间范围
    if (startDate && endDate) {
      periodStart = new Date(startDate);
      periodEnd = new Date(endDate);
    } else {
      switch (period) {
        case 'day':
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          const dayOfWeek = now.getDay();
          periodStart = new Date(now.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'month':
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }
    }

    // 1. 邮件成本统计
    const emailStatsResult = await db()
      .select({
        sent: sql<number>`count(*) filter (where ${emailNotifications.status} = 'sent' and ${emailNotifications.sentAt} >= ${periodStart} and ${emailNotifications.sentAt} <= ${periodEnd})`,
        failed: sql<number>`count(*) filter (where ${emailNotifications.status} = 'failed' and ${emailNotifications.sentAt} >= ${periodStart} and ${emailNotifications.sentAt} <= ${periodEnd})`,
        opened: sql<number>`count(*) filter (where ${emailNotifications.status} = 'opened' and ${emailNotifications.openedAt} >= ${periodStart} and ${emailNotifications.openedAt} <= ${periodEnd})`,
        clicked: sql<number>`count(*) filter (where ${emailNotifications.status} = 'clicked' and ${emailNotifications.clickedAt} >= ${periodStart} and ${emailNotifications.clickedAt} <= ${periodEnd})`,
      })
      .from(emailNotifications);

    const emailStats = emailStatsResult[0] || {
      sent: 0,
      failed: 0,
      opened: 0,
      clicked: 0,
    };

    // 按计划等级统计邮件发送量
    const emailByPlanResult = await db()
      .select({
        planLevel: digitalVaults.planLevel,
        count: sql<number>`count(distinct ${emailNotifications.vaultId})`,
        sentCount: sql<number>`count(*) filter (where ${emailNotifications.status} = 'sent' and ${emailNotifications.sentAt} >= ${periodStart} and ${emailNotifications.sentAt} <= ${periodEnd})`,
      })
      .from(emailNotifications)
      .innerJoin(digitalVaults, eq(emailNotifications.vaultId, digitalVaults.id))
      .where(
        and(
          gte(emailNotifications.sentAt, periodStart),
          lte(emailNotifications.sentAt, periodEnd)
        )
      )
      .groupBy(digitalVaults.planLevel);

    const emailByPlan = {
      free: 0,
      base: 0,
      pro: 0,
    };
    emailByPlanResult.forEach((row: { planLevel: string | null; sentCount: number | null }) => {
      const plan = (row.planLevel || 'free') as 'free' | 'base' | 'pro';
      emailByPlan[plan] = Number(row.sentCount || 0);
    });

    // 邮件发送趋势（最近 30 天）
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const emailTrendResult = await db()
      .select({
        date: sql<string>`DATE(${emailNotifications.sentAt})`,
        count: sql<number>`count(*)`,
      })
      .from(emailNotifications)
      .where(
        and(
          eq(emailNotifications.status, 'sent'),
          gte(emailNotifications.sentAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`DATE(${emailNotifications.sentAt})`)
      .orderBy(sql`DATE(${emailNotifications.sentAt})`);

    // 填充最近 30 天的数据
    const emailTrend = Array(30).fill(0);
    const trendMap = new Map(emailTrendResult.map((r: { date: string; count: number | null }) => [r.date, Number(r.count || 0)]));
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      emailTrend[i] = trendMap.get(dateStr) || 0;
    }

    // 2. 存储成本统计
    const storageStatsResult = await db()
      .select({
        totalSize: sql<number>`sum(length(${digitalVaults.encryptedData}))`,
        vaultCount: sql<number>`count(*)`,
        freeSize: sql<number>`sum(length(${digitalVaults.encryptedData})) filter (where ${digitalVaults.planLevel} = 'free')`,
        freeCount: sql<number>`count(*) filter (where ${digitalVaults.planLevel} = 'free')`,
        baseSize: sql<number>`sum(length(${digitalVaults.encryptedData})) filter (where ${digitalVaults.planLevel} = 'base')`,
        baseCount: sql<number>`count(*) filter (where ${digitalVaults.planLevel} = 'base')`,
        proSize: sql<number>`sum(length(${digitalVaults.encryptedData})) filter (where ${digitalVaults.planLevel} = 'pro')`,
        proCount: sql<number>`count(*) filter (where ${digitalVaults.planLevel} = 'pro')`,
      })
      .from(digitalVaults);

    const storageStats = storageStatsResult[0] || {
      totalSize: 0,
      vaultCount: 0,
      freeSize: 0,
      freeCount: 0,
      baseSize: 0,
      baseCount: 0,
      proSize: 0,
      proCount: 0,
    };

    // 存储增长趋势（最近 30 天）
    const storageTrendResult = await db()
      .select({
        date: sql<string>`DATE(${digitalVaults.createdAt})`,
        totalSize: sql<number>`sum(length(${digitalVaults.encryptedData}))`,
        vaultCount: sql<number>`count(*)`,
      })
      .from(digitalVaults)
      .where(gte(digitalVaults.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${digitalVaults.createdAt})`)
      .orderBy(sql`DATE(${digitalVaults.createdAt})`);

    // 计算累计存储趋势
    const storageTrend = Array(30).fill(0);
    let cumulativeSize = 0;
    const storageTrendMap = new Map(storageTrendResult.map((r: { date: string; totalSize: number | null }) => ({
      date: r.date,
      size: Number(r.totalSize || 0),
    })));
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const daySize = (storageTrendMap.get(dateStr) as { size: number } | undefined)?.size || 0;
      cumulativeSize += daySize;
      storageTrend[i] = cumulativeSize;
    }

    // 3. 物流成本统计（Pro 用户）
    const shippingStatsResult = await db()
      .select({
        totalOrders: sql<number>`count(*)`,
        ordersThisMonth: sql<number>`count(*) filter (where ${shippingLogs.createdAt} >= ${periodStart} and ${shippingLogs.createdAt} <= ${periodEnd})`,
        totalAmount: sql<number>`sum(${shippingLogs.finalAmount})`,
        amountThisMonth: sql<number>`sum(${shippingLogs.finalAmount}) filter (where ${shippingLogs.createdAt} >= ${periodStart} and ${shippingLogs.createdAt} <= ${periodEnd})`,
      })
      .from(shippingLogs);

    const shippingStats = shippingStatsResult[0] || {
      totalOrders: 0,
      ordersThisMonth: 0,
      totalAmount: 0,
      amountThisMonth: 0,
    };

    // 物流订单趋势（最近 30 天）
    const shippingTrendResult = await db()
      .select({
        date: sql<string>`DATE(${shippingLogs.createdAt})`,
        count: sql<number>`count(*)`,
        amount: sql<number>`sum(${shippingLogs.finalAmount})`,
      })
      .from(shippingLogs)
      .where(gte(shippingLogs.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${shippingLogs.createdAt})`)
      .orderBy(sql`DATE(${shippingLogs.createdAt})`);

    const shippingTrend = Array(30).fill(0);
    const shippingTrendMap = new Map(shippingTrendResult.map((r: { date: string; count: number | null; amount: number | null }) => ({
      date: r.date,
      count: Number(r.count || 0),
      amount: Number(r.amount || 0),
    })));
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      shippingTrend[i] = (shippingTrendMap.get(dateStr) as { count: number } | undefined)?.count || 0;
    }

    // 4. 成本报警阈值检查
    const ALERT_THRESHOLDS = {
      email: {
        daily: 500,
        weekly: 3000,
        monthly: 10000,
      },
      storage: {
        percentage: 90, // 假设总限制为 10GB
      },
      shipping: {
        daily: 10,
      },
    };

    const STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024; // 10GB
    const storagePercentage = (Number(storageStats.totalSize || 0) / STORAGE_LIMIT_BYTES) * 100;

    const alerts = [];
    if (Number(emailStats.sent || 0) > ALERT_THRESHOLDS.email.daily) {
      alerts.push({
        type: 'email',
        level: 'warning',
        message: `邮件发送量超过每日阈值：${emailStats.sent} > ${ALERT_THRESHOLDS.email.daily}`,
      });
    }
    if (storagePercentage > ALERT_THRESHOLDS.storage.percentage) {
      alerts.push({
        type: 'storage',
        level: 'critical',
        message: `存储使用率超过阈值：${storagePercentage.toFixed(2)}% > ${ALERT_THRESHOLDS.storage.percentage}%`,
      });
    }
    if (Number(shippingStats.ordersThisMonth || 0) > ALERT_THRESHOLDS.shipping.daily * 30) {
      alerts.push({
        type: 'shipping',
        level: 'warning',
        message: `本月物流订单超过阈值：${shippingStats.ordersThisMonth} > ${ALERT_THRESHOLDS.shipping.daily * 30}`,
      });
    }

    return respData({
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        type: period,
      },
      email: {
        total: {
          sent: Number(emailStats.sent || 0),
          failed: Number(emailStats.failed || 0),
          opened: Number(emailStats.opened || 0),
          clicked: Number(emailStats.clicked || 0),
        },
        byPlan: emailByPlan,
        trend: emailTrend,
        thresholds: ALERT_THRESHOLDS.email,
      },
      storage: {
        total: {
          sizeBytes: Number(storageStats.totalSize || 0),
          sizeMB: Number(storageStats.totalSize || 0) / (1024 * 1024),
          vaultCount: Number(storageStats.vaultCount || 0),
        },
        byPlan: {
          free: {
            sizeBytes: Number(storageStats.freeSize || 0),
            sizeMB: Number(storageStats.freeSize || 0) / (1024 * 1024),
            count: Number(storageStats.freeCount || 0),
          },
          base: {
            sizeBytes: Number(storageStats.baseSize || 0),
            sizeMB: Number(storageStats.baseSize || 0) / (1024 * 1024),
            count: Number(storageStats.baseCount || 0),
          },
          pro: {
            sizeBytes: Number(storageStats.proSize || 0),
            sizeMB: Number(storageStats.proSize || 0) / (1024 * 1024),
            count: Number(storageStats.proCount || 0),
          },
        },
        trend: storageTrend,
        percentage: storagePercentage,
        limitBytes: STORAGE_LIMIT_BYTES,
        threshold: ALERT_THRESHOLDS.storage.percentage,
      },
      shipping: {
        total: {
          orders: Number(shippingStats.totalOrders || 0),
          amount: Number(shippingStats.totalAmount || 0) / 100, // 转换为元
        },
        period: {
          orders: Number(shippingStats.ordersThisMonth || 0),
          amount: Number(shippingStats.amountThisMonth || 0) / 100,
        },
        trend: shippingTrend,
        threshold: ALERT_THRESHOLDS.shipping.daily,
      },
      alerts,
    });
  } catch (error: any) {
    console.error('Failed to get cost stats:', error);
    return respErr(error.message || 'Failed to get cost stats');
  }
}
