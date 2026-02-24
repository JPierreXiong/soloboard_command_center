/**
 * Upstash QStash Cron: Dead Man Switch Check
 * 每天检查一次失联用户
 * 
 * 使用 Upstash QStash 绕过 Vercel Hobby 的 Cron 限制
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handler(request: NextRequest) {
  try {
    console.log('🔍 [Cron] Dead Man Switch Check - Starting...');
    
    // TODO: 实现失联检测逻辑
    // 1. 查询所有启用死信开关的保险箱
    // 2. 检查最后活跃时间
    // 3. 发送预警邮件或触发资产释放
    
    const result = {
      checked: 0,
      warnings: 0,
      triggered: 0,
    };
    
    console.log('✅ [Cron] Dead Man Switch Check completed:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Dead Man Switch check completed',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [Cron] Dead Man Switch Check failed:', error);
    
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









