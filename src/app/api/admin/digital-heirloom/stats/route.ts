/**
 * GET /api/admin/digital-heirloom/stats
 * 管理员统计接口
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { canAccessAdmin } from '@/core/rbac/permission';
import { db } from '@/core/db';
import { digitalVaults, emailNotifications, shippingLogs, beneficiaries } from '@/config/db/schema';
import { eq, and, gte, sql, lt } from 'drizzle-orm';
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // 总保险箱数
    const totalVaultsResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(digitalVaults);
    const totalVaults = Number(totalVaultsResult[0]?.count || 0);

    // 活跃保险箱数
    const activeVaultsResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(digitalVaults)
      .where(eq(digitalVaults.status, 'active'));
    const activeVaults = Number(activeVaultsResult[0]?.count || 0);

    // 待验证保险箱数
    const pendingVerificationResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(digitalVaults)
      .where(eq(digitalVaults.status, 'pending_verification'));
    const pendingVerification = Number(pendingVerificationResult[0]?.count || 0);

    // 今日触发的保险箱数
    const triggeredTodayResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(digitalVaults)
      .where(
        and(
          eq(digitalVaults.status, 'triggered'),
          gte(digitalVaults.deadManSwitchActivatedAt, today)
        )
      );
    const triggeredToday = Number(triggeredTodayResult[0]?.count || 0);

    // 物流订单数
    const shippingOrdersResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(shippingLogs);
    const shippingOrders = Number(shippingOrdersResult[0]?.count || 0);

    // 邮件统计（今日）
    const emailStatsResult = await db()
      .select({
        sent: sql<number>`count(*) filter (where ${emailNotifications.status} = 'sent' and ${emailNotifications.sentAt} >= ${today})`,
        opened: sql<number>`count(*) filter (where ${emailNotifications.status} = 'opened' and ${emailNotifications.openedAt} >= ${today})`,
        clicked: sql<number>`count(*) filter (where ${emailNotifications.status} = 'clicked' and ${emailNotifications.clickedAt} >= ${today})`,
        failed: sql<number>`count(*) filter (where ${emailNotifications.status} = 'failed' and ${emailNotifications.sentAt} >= ${today})`,
      })
      .from(emailNotifications);
    const emailStats = emailStatsResult[0] || {
      sent: 0,
      opened: 0,
      clicked: 0,
      failed: 0,
    };

    // 存储统计
    const storageStatsResult = await db()
      .select({
        totalEncryptedSize: sql<number>`sum(length(${digitalVaults.encryptedData}))`,
        averageVaultSize: sql<number>`avg(length(${digitalVaults.encryptedData}))`,
      })
      .from(digitalVaults);
    const storageStats = storageStatsResult[0] || {
      totalEncryptedSize: 0,
      averageVaultSize: 0,
    };

    // 按计划等级统计
    const planDistributionResult = await db()
      .select({
        planLevel: digitalVaults.planLevel,
        count: sql<number>`count(*)`,
      })
      .from(digitalVaults)
      .groupBy(digitalVaults.planLevel);
    
    const planDistribution = {
      free: 0,
      base: 0,
      pro: 0,
    };
    planDistributionResult.forEach((row: { planLevel: string | null; count: number | null }) => {
      const plan = (row.planLevel || 'free') as 'free' | 'base' | 'pro';
      planDistribution[plan] = Number(row.count || 0);
    });

    // 高风险金库数量（剩余宽限期 < 48 小时）
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    
    // 查询所有 pending_verification 状态的金库
    const pendingVaults = await db()
      .select({
        id: digitalVaults.id,
        lastSeenAt: digitalVaults.lastSeenAt,
        heartbeatFrequency: digitalVaults.heartbeatFrequency,
        gracePeriod: digitalVaults.gracePeriod,
        planLevel: digitalVaults.planLevel,
      })
      .from(digitalVaults)
      .where(eq(digitalVaults.status, 'pending_verification'));

    let urgentVaultsCount = 0;
    const urgentVaultsByPlan = { free: 0, base: 0, pro: 0 };

    for (const vault of pendingVaults) {
      if (!vault.lastSeenAt) continue;
      
      const lastSeenDate = new Date(vault.lastSeenAt);
      const heartbeatFrequencyDays = vault.heartbeatFrequency || 90;
      const gracePeriodDays = vault.gracePeriod || 7;
      
      const deadlineDate = new Date(
        lastSeenDate.getTime() + heartbeatFrequencyDays * 24 * 60 * 60 * 1000
      );
      const gracePeriodEndDate = new Date(
        deadlineDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000
      );
      
      // 如果宽限期结束时间在未来 48 小时内
      if (gracePeriodEndDate <= fortyEightHoursFromNow && gracePeriodEndDate > now) {
        urgentVaultsCount++;
        const plan = (vault.planLevel || 'free') as 'free' | 'base' | 'pro';
        urgentVaultsByPlan[plan]++;
      }
    }

    // 潜在转化价值：Free 用户中 decryptionCount >= 1 的数量 × Base 计划单价
    // 假设 Base 计划年费为 $49（需要从配置或环境变量获取）
    const BASE_PLAN_PRICE = 49; // 美元/年，可以从配置读取
    
    const potentialConversionResult = await db()
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
    
    const potentialConversionUsers = new Set(potentialConversionResult.map((r: { vaultId: string; decryptionCount: number }) => r.vaultId)).size;
    const potentialConversionValue = potentialConversionUsers * BASE_PLAN_PRICE;

    // 本周趋势数据（最近 7 天）
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyTrendResult = await db()
      .select({
        date: sql<string>`DATE(${digitalVaults.createdAt})`,
        newVaults: sql<number>`count(*)`,
      })
      .from(digitalVaults)
      .where(gte(digitalVaults.createdAt, weekAgo))
      .groupBy(sql`DATE(${digitalVaults.createdAt})`)
      .orderBy(sql`DATE(${digitalVaults.createdAt})`);

    // 填充最近 7 天的数据
    const weeklyTrend = {
      newVaults: Array(7).fill(0),
      triggeredVaults: Array(7).fill(0),
    };
    
    const trendMap = new Map(weeklyTrendResult.map((r: { date: string; newVaults: number | null }) => [r.date, Number(r.newVaults || 0)]));
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      weeklyTrend.newVaults[i] = trendMap.get(dateStr) || 0;
    }

    // 本周触发的金库趋势
    const weeklyTriggeredResult = await db()
      .select({
        date: sql<string>`DATE(${digitalVaults.deadManSwitchActivatedAt})`,
        triggeredVaults: sql<number>`count(*)`,
      })
      .from(digitalVaults)
      .where(
        and(
          eq(digitalVaults.status, 'triggered'),
          gte(digitalVaults.deadManSwitchActivatedAt, weekAgo)
        )
      )
      .groupBy(sql`DATE(${digitalVaults.deadManSwitchActivatedAt})`)
      .orderBy(sql`DATE(${digitalVaults.deadManSwitchActivatedAt})`);

    const triggeredMap = new Map(weeklyTriggeredResult.map((r: any) => [r.date, Number(r.triggeredVaults || 0)]));
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      weeklyTrend.triggeredVaults[i] = triggeredMap.get(dateStr) || 0;
    }

    return respData({
      totalVaults,
      activeVaults,
      pendingVerification,
      triggeredToday,
      shippingOrders,
      urgentVaults: {
        total: urgentVaultsCount,
        byPlan: urgentVaultsByPlan,
      },
      planDistribution,
      potentialConversion: {
        userCount: potentialConversionUsers,
        estimatedValue: potentialConversionValue,
        basePlanPrice: BASE_PLAN_PRICE,
      },
      weeklyTrend,
      emailStats: {
        sentToday: Number(emailStats.sent || 0),
        openedToday: Number(emailStats.opened || 0),
        clickedToday: Number(emailStats.clicked || 0),
        failedToday: Number(emailStats.failed || 0),
      },
      storageStats: {
        totalEncryptedSize: Number(storageStats.totalEncryptedSize || 0),
        averageVaultSize: Number(storageStats.averageVaultSize || 0),
      },
    });
  } catch (error: any) {
    console.error('Failed to get admin stats:', error);
    return respErr(error.message || 'Failed to get admin stats');
  }
}
