import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/core/auth';
import { db } from '@/core/db';
import { user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    // 验证用户登录
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 查询用户详细信息
    const users = await db().select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = users[0];

    return NextResponse.json({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      planType: userData.planType || 'free',
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    });

  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get user info',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

