import { NextResponse } from 'next/server';

import { requireAdminAccess } from '@/core/rbac/permission';
import { findShippingLogsByStatus, ShippingStatus, ShippingFeeStatus, ShippingLog } from '@/shared/models/shipping-log';
import { db } from '@/core/db';
import { shippingLogs, beneficiaries, digitalVaults, user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 获取物流请求列表（管理员）
 * GET /api/admin/shipping/list
 */
export async function GET(req: Request) {
  try {
    // 检查管理员权限
    await requireAdminAccess({});

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ShippingStatus | null;
    const feeStatus = searchParams.get('feeStatus') as ShippingFeeStatus | null;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    // 获取物流记录
    const logs = await findShippingLogsByStatus(status || undefined, feeStatus || undefined, limit, offset);

    // 获取关联信息（受益人、保险箱、用户）
    const logsWithDetails = await Promise.all(
      logs.map(async (log: ShippingLog) => {
        const [beneficiary] = await db()
          .select()
          .from(beneficiaries)
          .where(eq(beneficiaries.id, log.beneficiaryId));

        const [vault] = await db()
          .select()
          .from(digitalVaults)
          .where(eq(digitalVaults.id, log.vaultId));

        const [owner] = vault
          ? await db()
              .select()
              .from(user)
              .where(eq(user.id, vault.userId))
          : [null];

        return {
          ...log,
          beneficiary,
          vault,
          owner,
        };
      })
    );

    // 获取总数
    const allLogs = await findShippingLogsByStatus(status || undefined, feeStatus || undefined);
    const total = allLogs.length;

    return NextResponse.json({
      success: true,
      data: logsWithDetails,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Get shipping list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get shipping list' },
      { status: 500 }
    );
  }
}




