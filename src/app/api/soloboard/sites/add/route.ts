/**
 * SoloBoard - API: 添加新的监控站点
 * 
 * POST /api/soloboard/sites/add
 * 
 * 创建新的监控站点配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { monitoredSites } from '@/config/db/schema';
import { auth } from '@/core/auth';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 添加新的监控站点
 */
export async function POST(request: NextRequest) {
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
    
    // 2. 解析请求体
    const body = await request.json();
    const { name, url, platform, config } = body;
    
    // 3. 验证必填字段
    if (!name || !url || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: name, url, platform' },
        { status: 400 }
      );
    }
    
    // 4. 验证平台类型
    const validPlatforms = ['GA4', 'STRIPE', 'UPTIME', 'LEMON_SQUEEZY', 'SHOPIFY'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }
    
    // 5. 检查用户站点数量限制（免费用户最多 3 个站点）
    const existingSites = await db().query.monitoredSites.findMany({
      where: (sites, { eq }) => eq(sites.userId, session.user.id),
    });
    
    // TODO: 根据用户订阅计划调整限制
    const maxSites = 10; // 临时设置为 10
    if (existingSites.length >= maxSites) {
      return NextResponse.json(
        { error: `You have reached the maximum number of sites (${maxSites})` },
        { status: 403 }
      );
    }
    
    // 6. 创建新站点
    const newSite = {
      id: nanoid(),
      userId: session.user.id,
      name,
      url,
      platform,
      config: config || {},
      status: 'active' as const,
      healthStatus: 'unknown' as const,
      displayOrder: existingSites.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db().insert(monitoredSites).values(newSite);
    
    // 7. 返回成功响应
    return NextResponse.json({
      success: true,
      site: {
        id: newSite.id,
        name: newSite.name,
        url: newSite.url,
        platform: newSite.platform,
        status: newSite.status,
        healthStatus: newSite.healthStatus,
      },
    });
  } catch (error) {
    console.error('Failed to add site:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
