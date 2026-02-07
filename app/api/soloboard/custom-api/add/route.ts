/**
 * API Route: 添加自定义 API 站点
 * POST /api/soloboard/custom-api/add
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { addCustomApiSite } from '@/shared/services/soloboard/custom-api-service';
import type { CustomApiConfig, CustomMetricMapping } from '@/shared/services/soloboard/custom-api-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, url, config, metrics } = body as {
      name: string;
      url: string;
      config: CustomApiConfig;
      metrics: CustomMetricMapping[];
    };

    if (!name || !url || !config) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const siteId = await addCustomApiSite(
      session.user.id,
      name,
      url,
      config,
      metrics
    );

    return NextResponse.json({
      success: true,
      siteId,
    });
  } catch (error) {
    console.error('Error adding custom API site:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add custom API site' },
      { status: 500 }
    );
  }
}



