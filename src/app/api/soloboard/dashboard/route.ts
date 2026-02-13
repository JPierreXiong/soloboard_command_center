/**
 * API: Get All Sites with Metrics
 * 获取用户所有站点及其实时指标
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/core/auth';
import { db } from '@/core/db';
import { monitoredSites } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

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

    // 转换为前端需要的格式
    const sites = userSites.map(site => {
      const apiConfig = site.apiConfig as any || {};
      const platforms = apiConfig.platforms || [];
      
      return {
        id: site.id,
        name: site.name,
        domain: site.domain,
        logoUrl: site.logoUrl,
        status: site.status === 'active' ? 'online' : 'offline',
        todayRevenue: 0, // TODO: 从实际 API 获取
        todayVisitors: 0, // TODO: 从实际 API 获取
        avgRevenue7d: 0, // TODO: 从历史数据计算
        platforms: platforms,
      };
    });

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

