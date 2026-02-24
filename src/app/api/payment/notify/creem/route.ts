import { NextRequest, NextResponse } from 'next/server';
import { createCreemProvider } from '@/extensions/payment/creem';
import { db } from '@/core/db';
import { order, subscription, user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { PaymentEventType } from '@/extensions/payment';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('🔔 [Webhook] Creem payment webhook received:', {
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
  });

  try {
    // 1. 检查 Creem 配置
    const creemApiKey = process.env.CREEM_API_KEY;
    const creemSigningSecret = process.env.CREEM_SIGNING_SECRET;
    const creemEnvironment = process.env.CREEM_ENVIRONMENT as 'sandbox' | 'production';

    if (!creemApiKey || !creemSigningSecret) {
      console.error('❌ [Webhook] Creem not configured:', {
        hasApiKey: !!creemApiKey,
        hasSigningSecret: !!creemSigningSecret,
      });
      return NextResponse.json(
        { error: 'Payment provider not configured' },
        { status: 500 }
      );
    }

    console.log('✅ [Webhook] Creem configuration found');

    // 2. 创建 Creem Provider
    const creemProvider = createCreemProvider({
      apiKey: creemApiKey,
      signingSecret: creemSigningSecret,
      environment: creemEnvironment || 'production',
    });

    // 3. 验证并解析 Webhook
    console.log('🔍 [Webhook] Verifying webhook signature...');
    const paymentEvent = await creemProvider.getPaymentEvent({ req });

    console.log('✅ [Webhook] Webhook verified successfully:', {
      eventType: paymentEvent.eventType,
      sessionId: paymentEvent.paymentSession?.paymentInfo?.transactionId,
      subscriptionId: paymentEvent.paymentSession?.subscriptionId,
      amount: paymentEvent.paymentSession?.paymentInfo?.amount,
      currency: paymentEvent.paymentSession?.paymentInfo?.currency,
    });

    // 4. 处理不同的事件类型
    let handlerResult;
    if (paymentEvent.eventType === PaymentEventType.CHECKOUT_SUCCESS) {
      console.log('📦 [Webhook] Processing CHECKOUT_SUCCESS event...');
      handlerResult = await handleCheckoutSuccess(paymentEvent);
    } else if (paymentEvent.eventType === PaymentEventType.PAYMENT_SUCCESS) {
      console.log('📦 [Webhook] Processing PAYMENT_SUCCESS event...');
      handlerResult = await handlePaymentSuccess(paymentEvent);
    } else if (paymentEvent.eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
      console.log('📦 [Webhook] Processing SUBSCRIBE_UPDATED event...');
      handlerResult = await handleSubscriptionUpdated(paymentEvent);
    } else if (paymentEvent.eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
      console.log('📦 [Webhook] Processing SUBSCRIBE_CANCELED event...');
      handlerResult = await handleSubscriptionCanceled(paymentEvent);
    } else {
      console.warn('⚠️ [Webhook] Unknown event type:', paymentEvent.eventType);
    }

    const duration = Date.now() - startTime;
    console.log('✅ [Webhook] Webhook processed successfully:', {
      eventType: paymentEvent.eventType,
      duration: `${duration}ms`,
      result: handlerResult,
    });

    return NextResponse.json({ 
      received: true,
      eventType: paymentEvent.eventType,
      processedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [Webhook] Webhook processing failed:', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });
    
    // 返回 500 让 Creem 重试
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// 处理首次支付成功
async function handleCheckoutSuccess(paymentEvent: any) {
  const session = paymentEvent.paymentSession;
  const metadata = session.metadata || {};
  const userId = metadata.userId || metadata.user_id;
  const orderId = metadata.orderId || metadata.order_no;

  console.log('💰 [CheckoutSuccess] Processing checkout success:', {
    userId,
    orderId,
    hasSubscriptionInfo: !!session.subscriptionInfo,
    amount: session.paymentInfo?.amount,
    currency: session.paymentInfo?.currency,
    metadata: metadata,
  });

  if (!userId || !orderId) {
    console.error('❌ [CheckoutSuccess] Missing userId or orderId in metadata:', metadata);
    throw new Error('Missing userId or orderId in webhook metadata');
  }

  try {
    // 更新订单状态
    console.log('📝 [CheckoutSuccess] Updating order status to paid...');
    const updateResult = await db().update(order)
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
      .where(eq(order.id, orderId))
      .returning();

    if (updateResult.length === 0) {
      console.error('❌ [CheckoutSuccess] Order not found:', orderId);
      throw new Error(`Order not found: ${orderId}`);
    }

    console.log('✅ [CheckoutSuccess] Order updated to paid:', {
      orderId,
      orderNo: updateResult[0].orderNo,
      amount: updateResult[0].amount,
    });

    // 如果有订阅信息，创建订阅记录
    if (session.subscriptionInfo) {
      const subInfo = session.subscriptionInfo;
      const subscriptionNo = `SUB-${Date.now()}-${orderId.substring(0, 8)}`;
      const planType = determinePlanType(subInfo.amount);

      console.log('📋 [CheckoutSuccess] Creating subscription:', {
        subscriptionId: session.subscriptionId,
        subscriptionNo,
        amount: subInfo.amount,
        planType,
        status: subInfo.status,
        interval: subInfo.interval,
        currentPeriodStart: subInfo.currentPeriodStart,
        currentPeriodEnd: subInfo.currentPeriodEnd,
      });

      try {
        const insertResult = await db().insert(subscription).values({
          id: session.subscriptionId,
          subscriptionNo,
          userId,
          userEmail: session.paymentInfo.paymentEmail,
          status: subInfo.status,
          paymentProvider: 'creem',
          paymentUserId: session.paymentInfo.paymentUserId,
          subscriptionId: session.subscriptionId,
          subscriptionResult: JSON.stringify(session.subscriptionResult),
          productId: subInfo.productId || 'unknown',
          description: subInfo.description || 'Subscription',
          amount: subInfo.amount,
          currency: subInfo.currency,
          interval: subInfo.interval,
          intervalCount: subInfo.intervalCount || 1,
          currentPeriodStart: subInfo.currentPeriodStart,
          currentPeriodEnd: subInfo.currentPeriodEnd,
          planType: planType,
          planName: planType === 'base' ? 'Base Plan' : planType === 'pro' ? 'Pro Plan' : 'Free Plan',
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        console.log('✅ [CheckoutSuccess] Subscription created successfully:', {
          subscriptionId: insertResult[0].subscriptionId,
          subscriptionNo: insertResult[0].subscriptionNo,
          planType: insertResult[0].planType,
        });

        // 更新用户的计划类型
        console.log('👤 [CheckoutSuccess] Upgrading user plan...');
        const userUpdateResult = await db().update(user)
          .set({
            planType: planType,
            updatedAt: new Date(),
          })
          .where(eq(user.id, userId))
          .returning();

        console.log('✅ [CheckoutSuccess] User upgraded successfully:', {
          userId,
          planType,
          userName: userUpdateResult[0]?.name,
        });

        return {
          success: true,
          orderId,
          subscriptionId: session.subscriptionId,
          planType,
        };

      } catch (subError: any) {
        console.error('❌ [CheckoutSuccess] Failed to create subscription:', {
          error: subError.message,
          code: subError.code,
          detail: subError.detail,
          subscriptionId: session.subscriptionId,
        });
        
        // 如果是重复键错误，可能订阅已存在
        if (subError.code === '23505') {
          console.warn('⚠️ [CheckoutSuccess] Subscription already exists, updating instead...');
          await db().update(subscription)
            .set({
              status: subInfo.status,
              currentPeriodStart: subInfo.currentPeriodStart,
              currentPeriodEnd: subInfo.currentPeriodEnd,
              updatedAt: new Date(),
            })
            .where(eq(subscription.subscriptionId, session.subscriptionId));
          
          return {
            success: true,
            orderId,
            subscriptionId: session.subscriptionId,
            note: 'Subscription already existed, updated',
          };
        }
        
        throw subError;
      }
    } else {
      console.warn('⚠️ [CheckoutSuccess] No subscription info in payment session');
      return {
        success: true,
        orderId,
        note: 'No subscription info',
      };
    }
  } catch (error: any) {
    console.error('❌ [CheckoutSuccess] Error processing checkout:', {
      error: error.message,
      stack: error.stack,
      userId,
      orderId,
    });
    throw error;
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
  await db().update(subscription)
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

// 根据金额判断计划类型（金额单位：分）
function determinePlanType(amount: number): string {
  if (amount === 0) return 'free';
  // Base Plan: $19.9 = 1990 cents
  // Pro Plan: $39.9 = 3990 cents
  if (amount <= 2000) return 'base'; // <= $20
  return 'pro'; // > $20
}

