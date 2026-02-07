/**
 * API Route: 生成 AI 周报
 * POST /api/soloboard/reports/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateAIReport, sendAIReportEmail } from '@/shared/services/soloboard/ai-report-service';
import type { ReportType } from '@/shared/services/soloboard/ai-report-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportType, sendEmail } = body as {
      reportType?: ReportType;
      sendEmail?: boolean;
    };

    // 生成报告
    const reportId = await generateAIReport(
      session.user.id,
      reportType || 'weekly'
    );

    // 如果需要发送邮件
    if (sendEmail && session.user.email) {
      await sendAIReportEmail(reportId, session.user.email);
    }

    return NextResponse.json({
      success: true,
      reportId,
    });
  } catch (error) {
    console.error('Error generating AI report:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI report' },
      { status: 500 }
    );
  }
}



