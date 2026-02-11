/**
 * SoloBoard - API 使用追踪服务
 * 
 * 记录和统计 API 调用，监控配额使用情况
 */

import { db } from '@/core/db';
import { apiUsageLogs, apiUsageStats } from '@/config/db/schema';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { sendAlert } from './alert-service';
import { API_QUOTA_LIMITS } from '@/config/alerts';

export interface ApiCallMetadata {
  userId: string;
  siteId: string;
  platform: 'GA4' | 'STRIPE' | 'UPTIME' | 'LEMON_SQUEEZY' | 'SHOPIFY';
  apiCallCount?: number;
}

export interface ApiCallResult {
  success: boolean;
  errorMessage?: string;
  responseTime: number; // milliseconds
}

/**
 * 记录 API 调用
 */
export async function trackApiCall(
  metadata: ApiCallMetadata,
  result: ApiCallResult
): Promise<void> {
  try {
    const logId = nanoid();
    
    // 1. 记录详细日志
    await db().insert(apiUsageLogs).values({
      id: logId,
      userId: metadata.userId,
      siteId: metadata.siteId,
      platform: metadata.platform,
      apiCallCount: metadata.apiCallCount || 1,
      success: result.success,
      errorMessage: result.errorMessage,
      responseTime: result.responseTime,
      timestamp: new Date(),
    });
    
    // 2. 更新每日统计
    await updateDailyStats(metadata, result);
    
    // 3. 检查配额预警
    await checkQuotaWarning(metadata.userId, metadata.platform);
  } catch (error) {
    console.error('Failed to track API call:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 更新每日统计
 */
async function updateDailyStats(
  metadata: ApiCallMetadata,
  result: ApiCallResult
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  try {
    // 查询今日统计
    const existing = await db()
      .select()
      .from(apiUsageStats)
      .where(
        and(
          eq(apiUsageStats.userId, metadata.userId),
          eq(apiUsageStats.date, today),
          eq(apiUsageStats.platform, metadata.platform)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);
    
    if (existing) {
      // 更新现有记录
      const newTotalCalls = existing.totalCalls + (metadata.apiCallCount || 1);
      const newSuccessfulCalls = result.success
        ? existing.successfulCalls + 1
        : existing.successfulCalls;
      const newFailedCalls = result.success
        ? existing.failedCalls
        : existing.failedCalls + 1;
      
      // 计算新的平均响应时间
      const newAverageResponseTime = Math.round(
        ((existing.averageResponseTime || 0) * existing.totalCalls + result.responseTime) /
          newTotalCalls
      );
      
      await db()
        .update(apiUsageStats)
        .set({
          totalCalls: newTotalCalls,
          successfulCalls: newSuccessfulCalls,
          failedCalls: newFailedCalls,
          averageResponseTime: newAverageResponseTime,
          updatedAt: new Date(),
        })
        .where(eq(apiUsageStats.id, existing.id));
    } else {
      // 创建新记录
      await db().insert(apiUsageStats).values({
        id: nanoid(),
        userId: metadata.userId,
        date: today,
        platform: metadata.platform,
        totalCalls: metadata.apiCallCount || 1,
        successfulCalls: result.success ? 1 : 0,
        failedCalls: result.success ? 0 : 1,
        averageResponseTime: result.responseTime,
      });
    }
  } catch (error) {
    console.error('Failed to update daily stats:', error);
  }
}

/**
 * 检查配额预警
 */
async function checkQuotaWarning(userId: string, platform: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const stats = await db()
      .select()
      .from(apiUsageStats)
      .where(
        and(
          eq(apiUsageStats.userId, userId),
          eq(apiUsageStats.date, today),
          eq(apiUsageStats.platform, platform)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);
    
    if (!stats) return;
    
    // 获取配额限制
    const limit = API_QUOTA_LIMITS[platform] || 10000;
    const usagePercent = (stats.totalCalls / limit) * 100;
    
    // 达到 80% 时发送预警
    if (usagePercent >= 80) {
      const severity = usagePercent >= 95 ? 'critical' : 'warning';
      
      await sendAlert({
        userId,
        alertType: 'api_quota_warning',
        severity,
        message: `${platform} API usage at ${usagePercent.toFixed(1)}% of daily limit (${stats.totalCalls}/${limit} calls)`,
        metadata: {
          platform,
          totalCalls: stats.totalCalls,
          limit,
          usagePercent,
        },
      });
    }
  } catch (error) {
    console.error('Failed to check quota warning:', error);
  }
}

/**
 * 获取用户的 API 使用统计
 */
export async function getUserApiUsage(
  userId: string,
  startDate: string,
  endDate: string
) {
  try {
    const stats = await db()
      .select()
      .from(apiUsageStats)
      .where(
        and(
          eq(apiUsageStats.userId, userId),
          // TODO: 添加日期范围过滤
        )
      )
      .orderBy(apiUsageStats.date);
    
    return stats;
  } catch (error) {
    console.error('Failed to get user API usage:', error);
    return [];
  }
}

/**
 * 获取平台的总体使用统计
 */
export async function getPlatformUsageStats(platform: string, date: string) {
  try {
    // TODO: 实现聚合查询
    return {
      platform,
      date,
      totalUsers: 0,
      totalCalls: 0,
      averageCallsPerUser: 0,
    };
  } catch (error) {
    console.error('Failed to get platform usage stats:', error);
    return null;
  }
}

