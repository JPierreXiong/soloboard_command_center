/**
 * GET /api/admin/digital-heirloom/security
 * 安全监控接口
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { canAccessAdmin } from '@/core/rbac/permission';
import { db } from '@/core/db';
import { beneficiaries, digitalVaults } from '@/config/db/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

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
    const days = parseInt(searchParams.get('days') || '7', 10); // 查询最近 N 天的记录

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 1. 异常解密尝试统计
    // 查询解密历史记录（从 beneficiaries.decryptionHistory JSONB 字段）
    const beneficiariesWithDecryptionHistory = await db()
      .select({
        id: beneficiaries.id,
        vaultId: beneficiaries.vaultId,
        email: beneficiaries.email,
        decryptionHistory: beneficiaries.decryptionHistory,
        decryptionCount: beneficiaries.decryptionCount,
        decryptionLimit: beneficiaries.decryptionLimit,
      })
      .from(beneficiaries)
      .where(sql`${beneficiaries.decryptionHistory} IS NOT NULL AND jsonb_array_length(${beneficiaries.decryptionHistory}) > 0`);

    // 分析解密历史，找出失败的尝试
    const failedAttempts: Array<{
      beneficiaryId: string;
      vaultId: string;
      email: string;
      timestamp: string;
      ip?: string;
      reason?: string;
    }> = [];

    beneficiariesWithDecryptionHistory.forEach((beneficiary: typeof beneficiaries.$inferSelect) => {
      const history = beneficiary.decryptionHistory as any[];
      if (Array.isArray(history)) {
        history.forEach((entry: any) => {
          if (entry.status === 'failed' || entry.success === false) {
            const entryDate = new Date(entry.timestamp || entry.createdAt);
            if (entryDate >= startDate) {
              failedAttempts.push({
                beneficiaryId: beneficiary.id,
                vaultId: beneficiary.vaultId,
                email: beneficiary.email,
                timestamp: entry.timestamp || entry.createdAt,
                ip: entry.ip,
                reason: entry.reason || entry.error,
              });
            }
          }
        });
      }
    });

    // 按 IP 地址统计失败次数
    const ipFailureCounts = new Map<string, number>();
    failedAttempts.forEach((attempt) => {
      if (attempt.ip) {
        ipFailureCounts.set(attempt.ip, (ipFailureCounts.get(attempt.ip) || 0) + 1);
      }
    });

    // 标记可疑 IP（失败次数 > 5）
    const suspiciousIPs = Array.from(ipFailureCounts.entries())
      .filter(([ip, count]) => count > 5)
      .map(([ip, count]) => ({
        ip,
        failureCount: count,
        level: count > 20 ? 'critical' : count > 10 ? 'high' : 'medium',
      }))
      .sort((a, b) => b.failureCount - a.failureCount);

    // 2. 访问日志统计（受益人访问记录）
    // 查询最近访问的受益人（通过 releaseToken 和 lastDecryptionAt）
    const recentAccessesResult = await db()
      .select({
        id: beneficiaries.id,
        vaultId: beneficiaries.vaultId,
        email: beneficiaries.email,
        lastDecryptionAt: beneficiaries.lastDecryptionAt,
        releaseToken: beneficiaries.releaseToken,
        releaseTokenExpiresAt: beneficiaries.releaseTokenExpiresAt,
      })
      .from(beneficiaries)
      .where(
        and(
          sql`${beneficiaries.lastDecryptionAt} IS NOT NULL`,
          gte(beneficiaries.lastDecryptionAt, startDate)
        )
      )
      .orderBy(desc(beneficiaries.lastDecryptionAt))
      .limit(100);
    
    type RecentAccess = {
      id: string;
      vaultId: string;
      email: string | null;
      lastDecryptionAt: Date | null;
      releaseToken: string | null;
      releaseTokenExpiresAt: Date | null;
    };
    const recentAccesses: RecentAccess[] = recentAccessesResult;

    // 3. 异常访问模式检测
    // 检测同一受益人在短时间内多次访问
    const accessPatterns = new Map<string, Array<{ timestamp: Date; vaultId: string }>>();
    recentAccesses.forEach((access: RecentAccess) => {
      if (access.lastDecryptionAt) {
        const key = `${access.vaultId}-${access.email}`;
        if (!accessPatterns.has(key)) {
          accessPatterns.set(key, []);
        }
        accessPatterns.get(key)!.push({
          timestamp: new Date(access.lastDecryptionAt),
          vaultId: access.vaultId,
        });
      }
    });

    // 识别异常模式（同一受益人在 1 小时内访问超过 5 次）
    const abnormalPatterns: Array<{
      vaultId: string;
      email: string;
      accessCount: number;
      timeWindow: string;
    }> = [];

    accessPatterns.forEach((accesses, key) => {
      if (accesses.length > 5) {
        // 检查是否在短时间内
        const sortedAccesses = accesses.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const firstAccess = sortedAccesses[0].timestamp;
        const lastAccess = sortedAccesses[sortedAccesses.length - 1].timestamp;
        const timeDiff = lastAccess.getTime() - firstAccess.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 1) {
          const [vaultId, email] = key.split('-');
          abnormalPatterns.push({
            vaultId,
            email,
            accessCount: accesses.length,
            timeWindow: `${hoursDiff.toFixed(2)} 小时`,
          });
        }
      }
    });

    // 4. 高风险金库统计（已过期但未触发的）
    const expiredVaults = await db()
      .select({
        id: digitalVaults.id,
        userId: digitalVaults.userId,
        status: digitalVaults.status,
        currentPeriodEnd: digitalVaults.currentPeriodEnd,
        lastSeenAt: digitalVaults.lastSeenAt,
      })
      .from(digitalVaults)
      .where(
        and(
          sql`${digitalVaults.currentPeriodEnd} IS NOT NULL`,
          sql`${digitalVaults.currentPeriodEnd} < ${now}`,
          sql`${digitalVaults.status} != 'triggered'`
        )
      )
      .limit(50);

    return respData({
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
      failedDecryptionAttempts: {
        total: failedAttempts.length,
        recent: failedAttempts.slice(0, 50), // 最近 50 条
        byIP: Array.from(ipFailureCounts.entries()).map(([ip, count]) => ({
          ip,
          count,
        })),
      },
      suspiciousIPs,
      recentAccesses: recentAccesses.map((access: RecentAccess) => ({
        beneficiaryId: access.id,
        vaultId: access.vaultId,
        email: access.email,
        lastAccessAt: access.lastDecryptionAt,
        hasActiveToken: access.releaseToken && 
          access.releaseTokenExpiresAt && 
          new Date(access.releaseTokenExpiresAt) > now,
      })),
      abnormalPatterns,
      expiredVaults: expiredVaults.map((vault: typeof digitalVaults.$inferSelect) => ({
        id: vault.id,
        userId: vault.userId,
        status: vault.status,
        expiredAt: vault.currentPeriodEnd,
        daysSinceExpired: Math.floor(
          (now.getTime() - new Date(vault.currentPeriodEnd!).getTime()) / (1000 * 60 * 60 * 24)
        ),
      })),
    });
  } catch (error: any) {
    console.error('Failed to get security stats:', error);
    return respErr(error.message || 'Failed to get security stats');
  }
}
