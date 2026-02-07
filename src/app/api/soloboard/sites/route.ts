/**
 * SoloBoard - API: 获取用户的所有监控站点
 * 
 * GET /api/soloboard/sites
 * 
 * 返回用户的所有站点及其最新快照数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { monitoredSites } from '@/config/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@/core/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 获取用户的所有监控站点
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. 查询用户的所有站点
    const sites = await db.query.monitoredSites.findMany({
      where: eq(monitoredSites.userId, session.user.id),
      orderBy: [desc(monitoredSites.displayOrder)],
    });
    
    // 3. 移除敏感信息（不返回加密的 API 配置）
    const sanitizedSites = sites.map((site) => ({
      id: site.id,
      name: site.name,
      url: site.url,
      platform: site.platform,
      status: site.status,
      healthStatus: site.healthStatus,
      lastSnapshot: site.lastSnapshot,
      lastSyncAt: site.lastSyncAt,
      lastErrorAt: site.lastErrorAt,
      lastErrorMessage: site.lastErrorMessage,
      displayOrder: site.displayOrder,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    }));
    
    return NextResponse.json({
      success: true,
      sites: sanitizedSites,
      total: sanitizedSites.length,
    });
  } catch (error) {
    console.error('Failed to fetch sites:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



