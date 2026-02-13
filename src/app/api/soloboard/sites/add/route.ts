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
import { eq } from 'drizzle-orm';

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
    const { 
      name, 
      domain, 
      description,
      logoUrl,
      platforms = [], 
      apiKeys = {},
      otherPlatform,
      enableGA4,
      ga4PropertyId,
    } = body;
    
    // 3. 验证必填字段
    if (!domain) {
      return NextResponse.json(
        { error: 'Missing required field: domain' },
        { status: 400 }
      );
    }
    
    // 4. 检查用户站点数量限制
    const existingSites = await db()
      .select()
      .from(monitoredSites)
      .where(eq(monitoredSites.userId, session.user.id));
    
    // TODO: 根据用户订阅计划调整限制
    const maxSites = 10;
    if (existingSites.length >= maxSites) {
      return NextResponse.json(
        { error: `You have reached the maximum number of sites (${maxSites})` },
        { status: 403 }
      );
    }
    
    // 5. 构建 API 配置（加密存储）
    const apiConfig: any = {
      platforms: platforms,
      apiKeys: apiKeys, // TODO: 使用 AES-256 加密
      otherPlatform: otherPlatform || null,
    };
    
    if (enableGA4 && ga4PropertyId) {
      apiConfig.ga4 = {
        propertyId: ga4PropertyId,
      };
    }
    
    // 6. 创建新站点记录
    const siteId = nanoid();
    const siteName = name || domain;
    
    await db().insert(monitoredSites).values({
      id: siteId,
      userId: session.user.id,
      name: siteName,
      domain: domain,
      logoUrl: logoUrl || null,
      platform: platforms.length > 0 ? platforms[0] : 'uptime', // 主平台
      url: `https://${domain}`,
      apiConfig: apiConfig,
      status: 'active',
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // 7. 返回成功响应
    return NextResponse.json({
      success: true,
      site: {
        id: siteId,
        name: siteName,
        domain: domain,
        logoUrl: logoUrl,
        platforms: platforms,
        status: 'active',
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
