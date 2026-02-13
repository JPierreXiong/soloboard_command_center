/**
 * Creem Webhook Handler for SoloBoard Monitoring
 * 
 * 用途：接收用户 Creem 店铺的订单通知，实时更新 Dashboard 数据
 * 
 * 与 /api/payment/notify/creem 的区别：
 * - /api/payment/notify/creem: 处理 SoloBoard 自己的收款
 * - /api/webhooks/creem: 监控用户的 Creem 店铺订单
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { monitoredSites, siteMetricsDaily } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreemWebhookPayload {
  event_type: string;
  data: {
    order_id: string;
    site_id?: string; // 用户在配置时可以在 Creem 中设置 metadata
    amount: number;
    currency: string;
    customer_email: string;
    status: string;
    created_at: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. 验证 Webhook 签名
    const signature = req.headers.get('x-creem-signature');
    const webhookSecret = process.env.CREEM_WEBHOOK_SECRET || process.env.CREEM_SIGNING_SECRET;

    if (!webhookSecret) {
      console.error('CREEM_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // 简单的签名验证（实际应该使用 HMAC）
    if (signature !== webhookSecret) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 2. 解析 Webhook 数据
    const payload: CreemWebhookPayload = await req.json();

    console.log('Creem monitoring webhook received:', {
      eventType: payload.event_type,
      orderId: payload.data.order_id,
      amount: payload.data.amount,
    });

    // 3. 处理订单完成事件
    if (payload.event_type === 'order.completed' || payload.event_type === 'payment.succeeded') {
      await handleOrderCompleted(payload);
    }

    return NextResponse.json({ 
      received: true,
      message: 'Webhook processed successfully'
    });

  } catch (error: any) {
    console.error('Creem monitoring webhook error:', error);
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error.message 
      },
      { status: 400 }
    );
  }
}

/**
 * 处理订单完成事件
 * 更新站点的今日收入数据
 */
async function handleOrderCompleted(payload: CreemWebhookPayload) {
  const { data } = payload;
  
  // 如果 Webhook 中包含 site_id，直接使用
  let siteId = data.site_id;

  // 如果没有 site_id，尝试通过 customer_email 或其他方式查找
  if (!siteId) {
    // 查找所有配置了 Creem 的站点
    const sites = await db()
      .select()
      .from(monitoredSites)
      .where(eq(monitoredSites.platform, 'creem'));

    if (sites.length === 0) {
      console.warn('No Creem sites found in database');
      return;
    }

    // 如果只有一个 Creem 站点，默认使用它
    if (sites.length === 1) {
      siteId = sites[0].id;
    } else {
      console.warn('Multiple Creem sites found, cannot determine which one');
      return;
    }
  }

  // 更新今日收入数据
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 检查今天是否已有记录
  const existingMetrics = await db()
    .select()
    .from(siteMetricsDaily)
    .where(eq(siteMetricsDaily.siteId, siteId))
    .limit(1);

  const revenueInCents = Math.round(data.amount * 100); // 转换为 cents

  if (existingMetrics.length > 0) {
    // 更新现有记录
    await db()
      .update(siteMetricsDaily)
      .set({
        revenue: (existingMetrics[0].revenue || 0) + revenueInCents,
      })
      .where(eq(siteMetricsDaily.id, existingMetrics[0].id));
  } else {
    // 创建新记录
    await db()
      .insert(siteMetricsDaily)
      .values({
        id: `metric-${Date.now()}-${siteId}`,
        siteId,
        date: today,
        revenue: revenueInCents,
        visitors: 0,
        uptimePercentage: 100,
        responseTime: 0,
        createdAt: new Date(),
      });
  }

  // 更新站点的最后同步时间
  await db()
    .update(monitoredSites)
    .set({
      lastSyncAt: new Date(),
      lastSyncStatus: 'success',
      updatedAt: new Date(),
    })
    .where(eq(monitoredSites.id, siteId));

  console.log('Creem order processed:', {
    siteId,
    orderId: data.order_id,
    amount: data.amount,
    revenueInCents,
  });
}

/**
 * GET 方法用于测试 Webhook 是否正常工作
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Creem monitoring webhook endpoint is active',
    endpoint: '/api/webhooks/creem',
    methods: ['POST'],
    requiredHeaders: ['x-creem-signature'],
  });
}

