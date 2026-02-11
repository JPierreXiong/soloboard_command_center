import { NextRequest, NextResponse } from 'next/server';
import { createCreemProvider } from '@/extensions/payment/creem';
import { db } from '@/core/db';
import { order, subscription, user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { PaymentEventType } from '@/extensions/payment';

export async function POST(req: NextRequest) {
  try {
    // 1. 检查 Creem 配置
    const creemApiKey = process.env.CREEM_API_KEY;
    const creemSigningSecret = process.env.CREEM_SIGNING_SECRET;
    const creemEnvironment = process.env.CREEM_ENVIRONMENT as 'sandbox' | 'production';

    if (!creemApiKey || !creemSigningSecret) {
      console.error('Creem not configured');
      return NextResponse.json(
        { error: 'Payment provider not configured' },
        { status: 500 }
      );
    }

    // 2. 创建 Creem Provider
    const creemProvider = createCreemProvider({
      apiKey: creemApiKey,
      signingSecret: creemSigningSecret,
      environment: creemEnvironment || 'production',
    });

    // 3. 验证并解析 Webhook
    const paymentEvent = await creemProvider.getPaymentEvent({ req });

    console.log('Creem webhook received:', {
      eventType: paymentEvent.eventType,
      sessionId: paymentEvent.paymentSession?.paymentInfo?.transactionId,
    });

    // 4. 处理不同的事件类型
    if (paymentEvent.eventType === PaymentEventType.CHECKOUT_SUCCESS) {
      // 支付成功
      await handleCheckoutSuccess(paymentEvent);
    } else if (paymentEvent.eventType === PaymentEventType.PAYMENT_SUCCESS) {
      // 订阅续费成功
      await handlePaymentSuccess(paymentEvent);
    } else if (paymentEvent.eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
      // 订阅更新
      await handleSubscriptionUpdated(paymentEvent);
    } else if (paymentEvent.eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
      // 订阅取消
      await handleSubscriptionCanceled(paymentEvent);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Creem webhook error:', error);
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error.message 
      },
      { status: 400 }
    );
  }
}

// 处理首次支付成功
async function handleCheckoutSuccess(paymentEvent: any) {
  const session = paymentEvent.paymentSession;
  const metadata = session.metadata || {};
  const userId = metadata.userId;
  const orderId = metadata.orderId;

  if (!userId || !orderId) {
    console.error('Missing userId or orderId in metadata');
    return;
  }

  // 更新订单状态
  await db().update(order)
    .set({
      status: 'paid',
      amount: session.paymentInfo.amount,
      currency: session.paymentInfo.currency,
      paymentAmount: session.paymentInfo.paymentAmount,
      paymentCurrency: session.paymentInfo.paymentCurrency,
      paymentEmail: session.paymentInfo.paymentEmail,
      paymentUserName: session.paymentInfo.paymentUserName,
      paymentUserId: session.paymentInfo.paymentUserId,
      transactionId: session.paymentInfo.transactionId,
      paidAt: session.paymentInfo.paidAt,
      paymentResult: JSON.stringify(session.paymentResult),
      subscriptionId: session.subscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(order.id, orderId));

  // 如果有订阅信息，创建订阅记录
  if (session.subscriptionInfo) {
    const subInfo = session.subscriptionInfo;
    const subscriptionNo = `SUB-${Date.now()}-${orderId.substring(0, 8)}`;

    await db().insert(subscription).values({
      id: session.subscriptionId,
      subscriptionNo,
      userId,
      userEmail: session.paymentInfo.paymentEmail,
      status: subInfo.status,
      paymentProvider: 'creem',
      subscriptionId: session.subscriptionId,
      subscriptionResult: JSON.stringify(session.subscriptionResult),
      productId: subInfo.productId,
      description: subInfo.description,
      amount: subInfo.amount,
      currency: subInfo.currency,
      interval: subInfo.interval,
      intervalCount: subInfo.intervalCount,
      currentPeriodStart: subInfo.currentPeriodStart,
      currentPeriodEnd: subInfo.currentPeriodEnd,
      planType: determinePlanType(subInfo.amount),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 更新用户的计划类型
    await db().update(user)
      .set({
        planType: determinePlanType(subInfo.amount),
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    console.log('Subscription created and user upgraded:', {
      userId,
      subscriptionId: session.subscriptionId,
      planType: determinePlanType(subInfo.amount),
    });
  }
}

// 处理订阅续费成功
async function handlePaymentSuccess(paymentEvent: any) {
  const session = paymentEvent.paymentSession;
  const subInfo = session.subscriptionInfo;

  if (!subInfo) return;

  // 更新订阅状态
  await db().update(subscription)
    .set({
      status: subInfo.status,
      currentPeriodStart: subInfo.currentPeriodStart,
      currentPeriodEnd: subInfo.currentPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscription.subscriptionId, session.subscriptionId));

  console.log('Subscription renewed:', session.subscriptionId);
}

// 处理订阅更新
async function handleSubscriptionUpdated(paymentEvent: any) {
  const session = paymentEvent.paymentSession;
  const subInfo = session.subscriptionInfo;

  if (!subInfo) return;

  await db().update(subscription)
    .set({
      status: subInfo.status,
      currentPeriodStart: subInfo.currentPeriodStart,
      currentPeriodEnd: subInfo.currentPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscription.subscriptionId, session.subscriptionId));

  console.log('Subscription updated:', session.subscriptionId);
}

// 处理订阅取消
async function handleSubscriptionCanceled(paymentEvent: any) {
  const session = paymentEvent.paymentSession;
  const subInfo = session.subscriptionInfo;

  if (!subInfo) return;

  // 更新订阅状态
  await db.update(subscription)
    .set({
      status: 'canceled',
      canceledAt: subInfo.canceledAt,
      updatedAt: new Date(),
    })
    .where(eq(subscription.subscriptionId, session.subscriptionId));

  // 查找订阅对应的用户
  const subs = await db().select()
    .from(subscription)
    .where(eq(subscription.subscriptionId, session.subscriptionId))
    .limit(1);

  if (subs.length > 0) {
    const sub = subs[0];
    // 将用户降级为 free
    await db().update(user)
      .set({
        planType: 'free',
        updatedAt: new Date(),
      })
      .where(eq(user.id, sub.userId));

    console.log('Subscription canceled and user downgraded:', {
      userId: sub.userId,
      subscriptionId: session.subscriptionId,
    });
  }
}

// 根据金额判断计划类型
function determinePlanType(amount: number): string {
  if (amount === 0) return 'free';
  if (amount < 5000) return 'base'; // < $50
  return 'pro'; // >= $50
}

