/**
 * API Route: 创建报警规则
 * POST /api/soloboard/alerts/rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAlertRule } from '@/shared/services/soloboard/alert-service';
import type { AlertRuleConfig } from '@/shared/services/soloboard/alert-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { siteId, config } = body as {
      siteId: string;
      config: AlertRuleConfig;
    };

    if (!siteId || !config) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const ruleId = await createAlertRule(session.user.id, siteId, config);

    return NextResponse.json({
      success: true,
      ruleId,
    });
  } catch (error) {
    console.error('Error creating alert rule:', error);
    return NextResponse.json(
      { error: 'Failed to create alert rule' },
      { status: 500 }
    );
  }
}



