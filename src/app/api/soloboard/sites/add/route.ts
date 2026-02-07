/**
 * SoloBoard - API: 添加新的监控站点
 * 
 * POST /api/soloboard/sites/add
 * 
 * 添加新站点并验证 API 配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { monitoredSites } from '@/config/db/schema';
import { eq, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '@/core/auth';
import { encryptSiteConfigObject, type SiteApiConfig } from '@/shared/lib/site-crypto';
import { validateGA4Config } from '@/shared/services/soloboard/ga4-fetcher';
import { validateStripeConfig } from '@/shared/services/soloboard/stripe-fetcher';
import { validateUptimeConfig } from '@/shared/services/soloboard/uptime-fetcher';

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
    const { name, url, platform, config } = body as {
      name: string;
      url: string;
      platform: 'GA4' | 'STRIPE' | 'LEMON_SQUEEZY' | 'SHOPIFY' | 'UPTIME';
      config: SiteApiConfig;
    };
    
    // 3. 验证必填字段
    if (!name || !platform || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: name, platform, config' },
        { status: 400 }
      );
    }
    
    // 4. 检查用户的站点数量限制（免费版最多 2 个）
    const userSitesCount = await db
      .select({ count: count() })
      .from(monitoredSites)
      .where(eq(monitoredSites.userId, session.user.id));
    
    const currentCount = userSitesCount[0]?.count || 0;
    
    // TODO: 根据用户的订阅计划检查限制
    const maxSites = 2; // 免费版限制
    
    if (currentCount >= maxSites) {
      return NextResponse.json(
        { 
          error: `Site limit reached. Free plan allows maximum ${maxSites} sites.`,
          upgrade: true,
        },
        { status: 403 }
      );
    }
    
    // 5. 验证 API 配置
    let isValid = false;
    
    try {
      switch (platform) {
        case 'GA4':
          if (!config.ga4) {
            throw new Error('GA4 configuration is required');
          }
          isValid = await validateGA4Config(config.ga4);
          break;
          
        case 'STRIPE':
          if (!config.stripe) {
            throw new Error('Stripe configuration is required');
          }
          isValid = await validateStripeConfig(config.stripe);
          break;
          
        case 'UPTIME':
          if (!config.uptime) {
            throw new Error('Uptime configuration is required');
          }
          isValid = await validateUptimeConfig(config.uptime);
          break;
          
        default:
          throw new Error(`Platform ${platform} is not yet supported`);
      }
    } catch (validationError) {
      return NextResponse.json(
        {
          error: 'Invalid API configuration',
          details: validationError instanceof Error ? validationError.message : 'Unknown error',
        },
        { status: 400 }
      );
    }
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'API configuration validation failed' },
        { status: 400 }
      );
    }
    
    // 6. 加密 API 配置
    const encryptedConfig = encryptSiteConfigObject(config);
    
    // 7. 插入数据库
    const siteId = nanoid();
    
    await db.insert(monitoredSites).values({
      id: siteId,
      userId: session.user.id,
      name,
      url: url || '',
      platform,
      encryptedConfig,
      status: 'active',
      displayOrder: currentCount,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Site added successfully',
      siteId,
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



