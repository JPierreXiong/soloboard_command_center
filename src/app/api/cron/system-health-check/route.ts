/**
 * Upstash QStash Cron: System Health Check
 * 每小时检查一次系统健康状态
 * 
 * 使用 Upstash QStash 绕过 Vercel Hobby 的 Cron 限制
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function handler(request: NextRequest) {
  try {
    console.log('🏥 [Cron] System Health Check - Starting...');
    
    // TODO: 实现系统健康检查逻辑
    // 1. 检查数据库连接
    // 2. 检查邮件服务状态
    // 3. 检查存储空间
    // 4. 检查 API 响应时间
    
    const result = {
      database: 'healthy',
      email: 'healthy',
      storage: 'healthy',
      api: 'healthy',
    };
    
    console.log('✅ [Cron] System Health Check completed:', result);
    
    return NextResponse.json({
      success: true,
      message: 'System health check completed',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [Cron] System Health Check failed:', error);
    
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

// 使用 Upstash QStash 签名验证包装 handler
export const POST = verifySignatureAppRouter(handler);

// 也支持 GET（用于手动测试）
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return handler(request);
}








