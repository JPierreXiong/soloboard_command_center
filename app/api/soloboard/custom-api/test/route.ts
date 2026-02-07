/**
 * API Route: 测试自定义 API 配置
 * POST /api/soloboard/custom-api/test
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { testCustomApiConfig } from '@/shared/services/soloboard/custom-api-service';
import type { CustomApiConfig } from '@/shared/services/soloboard/custom-api-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { config } = body as { config: CustomApiConfig };

    if (!config) {
      return NextResponse.json(
        { error: 'Missing config' },
        { status: 400 }
      );
    }

    const result = await testCustomApiConfig(config);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing custom API:', error);
    return NextResponse.json(
      { error: 'Failed to test custom API' },
      { status: 500 }
    );
  }
}



