/**
 * Cron Job: 检查所有站点的报警规则
 * GET /api/cron/check-alerts
 * 
 * 建议每 5 分钟运行一次
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAllSitesForAlerts } from '@/shared/services/soloboard/alert-service';

export async function GET(request: NextRequest) {
  try {
    // 验证 Cron Secret（可选，用于安全）
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting alert check...');
    await checkAllSitesForAlerts();

    return NextResponse.json({
      success: true,
      message: 'Alert check completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Alert check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



