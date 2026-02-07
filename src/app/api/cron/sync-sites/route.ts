/**
 * SoloBoard - Cron Job: 数据同步
 * 
 * 定时任务：每 15 分钟同步一次所有站点数据
 * 
 * Vercel Cron 配置在 vercel.json 中
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllSites } from '@/shared/services/soloboard/sync-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 分钟超时

/**
 * Cron Job 处理函数
 * 
 * 安全验证（三重保护）：
 * 1. URL 参数中的 secret（Upstash QStash 使用）
 * 2. Authorization header 中的 Bearer Token
 * 3. Vercel Cron 的特殊 header
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    
    // 方式 1: URL 参数验证（Upstash QStash）
    const { searchParams } = new URL(request.url);
    const urlSecret = searchParams.get('secret');
    
    // 方式 2: Authorization Header 验证
    const authHeader = request.headers.get('authorization');
    
    // 方式 3: Vercel Cron Header 验证
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    
    // 任意一种验证通过即可
    const isAuthorized = 
      urlSecret === cronSecret ||
      authHeader === `Bearer ${cronSecret}` ||
      isVercelCron;
    
    if (!isAuthorized) {
      console.warn('⚠️ [Cron] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('🚀 [Cron] Starting site data sync...');
    
    // 执行同步
    const result = await syncAllSites();
    
    console.log('✅ [Cron] Sync completed:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Site data sync completed',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [Cron] Sync failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}



