/**
 * API: Get All Sites with Metrics
 * 获取用户所有站点及其实时指标
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/core/auth';
import { db } from '@/core/db';
import { monitoredSites, siteMetricsDaily } from '@/config/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { aggregateSiteData } from '@/shared/services/soloboard/aggregation-service';
import { detectAnomaly, calculateHistoricalAverage } from '@/shared/services/soloboard/anomaly-detection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 从数据库获取用户的所有站点
    const userSites = await db()
      .select()
      .from(monitoredSites)
      .where(eq(monitoredSites.userId, session.user.id));

    // 获取7天前的日期
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 并行获取所有站点的实时数据和历史数据
    const sites = await Promise.all(
      userSites.map(async (site) => {
        const apiConfig = site.apiConfig as any || {};
        const platforms = apiConfig.platforms || {};

        // 1. 获取实时数据（调用聚合服务）
        let liveMetrics = {
          revenue: { today: 0, sources: {} },
          traffic: { today: 0 },
          uptime: { status: 'up' as 'up' | 'down', responseTime: 0 },
        };

        try {
          liveMetrics = await aggregateSiteData({
            id: site.id,
            domain: site.domain,
            platforms,
          });
        } catch (error) {
          console.error(`Error fetching live metrics for ${site.domain}:`, error);
        }

        // 2. 获取历史数据（最近7天）
        const historyData = await db()
          .select()
          .from(siteMetricsDaily)
          .where(
            and(
              eq(siteMetricsDaily.siteId, site.id),
              gte(siteMetricsDaily.date, sevenDaysAgo)
            )
          )
          .orderBy(desc(siteMetricsDaily.date));

        // 3. 计算历史平均值
        const historical = calculateHistoricalAverage(
          historyData.map(d => ({
            revenue: d.revenue || 0,
            visitors: d.visitors || 0,
          }))
        );

        // 4. 异常检测
        const anomaly = detectAnomaly(
          {
            revenue: liveMetrics.revenue.today,
            visitors: liveMetrics.traffic.today,
            uptimeStatus: liveMetrics.uptime.status,
          },
          historical
        );

        return {
          id: site.id,
          name: site.name,
          domain: site.domain,
          logoUrl: site.logoUrl,
          status: anomaly.status,
          alert: anomaly.alert,
          todayRevenue: liveMetrics.revenue.today,
          todayVisitors: liveMetrics.traffic.today,
          avgRevenue7d: historical.avgRevenue7d,
          avgVisitors7d: historical.avgVisitors7d,
          platforms: Object.keys(platforms),
          responseTime: liveMetrics.uptime.responseTime,
        };
      })
    );

    // 计算汇总数据
    const summary = {
      totalSites: sites.length,
      totalRevenue: sites.reduce((sum, site) => sum + site.todayRevenue, 0),
      totalVisitors: sites.reduce((sum, site) => sum + site.todayVisitors, 0),
      sitesOnline: sites.filter(site => site.status === 'online').length,
    };

    return NextResponse.json({
      sites,
      summary,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    );
  }
}

