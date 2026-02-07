/**
 * API Route: 邀请团队成员
 * POST /api/soloboard/teams/[teamId]/invite
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { inviteTeamMember } from '@/shared/services/soloboard/team-service';
import type { TeamRole } from '@/shared/services/soloboard/team-service';

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
    const { email, role } = body as { email: string; role?: TeamRole };

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const memberId = await inviteTeamMember(
      params.teamId,
      session.user.id,
      email,
      role
    );

    return NextResponse.json({
      success: true,
      memberId,
    });
  } catch (error) {
    console.error('Error inviting team member:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to invite member' },
      { status: 500 }
    );
  }
}



