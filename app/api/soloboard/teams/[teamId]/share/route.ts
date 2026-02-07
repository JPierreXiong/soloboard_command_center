/**
 * API Route: 共享站点到团队
 * POST /api/soloboard/teams/[teamId]/share
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { shareSiteToTeam } from '@/shared/services/soloboard/team-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { siteId } = body as { siteId: string };

    if (!siteId) {
      return NextResponse.json(
        { error: 'Site ID is required' },
        { status: 400 }
      );
    }

    const shareId = await shareSiteToTeam(
      params.teamId,
      siteId,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      shareId,
    });
  } catch (error) {
    console.error('Error sharing site:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to share site' },
      { status: 500 }
    );
  }
}



