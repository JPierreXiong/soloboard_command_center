/**
 * 创建支付会话 API
 * 支持 Stripe、PayPal、支付宝
 */

import { NextRequest } from 'next/server';
import { 
  paymentManager, 
  PaymentType, 
  PaymentInterval,
  createStripeProvider,
  createPayPalProvider,
  createAlipayProvider,
  createCreemProvider
} from '@/extensions/payment';

// 初始化支付提供商
function initializePaymentProviders() {
  // Creem (优先使用)
  if (process.env.CREEM_API_KEY) {
    const creemProvider = createCreemProvider({
      apiKey: process.env.CREEM_API_KEY,
      signingSecret: process.env.CREEM_SIGNING_SECRET,
      environment: (process.env.CREEM_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
    });
    paymentManager.addProvider(creemProvider, true);
  }

  // Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    const stripeProvider = createStripeProvider({
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
      signingSecret: process.env.STRIPE_WEBHOOK_SECRET,
      allowedPaymentMethods: ['card', 'wechat_pay', 'alipay']
    });
    paymentManager.addProvider(stripeProvider, !process.env.CREEM_API_KEY);
  }

  // PayPal
  if (process.env.PAYPAL_CLIENT_ID) {
    const paypalProvider = createPayPalProvider({
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
      webhookSecret: process.env.PAYPAL_WEBHOOK_ID,
      environment: (process.env.PAYPAL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
    });
    paymentManager.addProvider(paypalProvider);
  }

  // Alipay
  if (process.env.ALIPAY_APP_ID) {
    const alipayProvider = createAlipayProvider({
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY!,
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY!,
      notifyUrl: process.env.ALIPAY_NOTIFY_URL
    });
    paymentManager.addProvider(alipayProvider);
  }
}

// 初始化
initializePaymentProviders();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      amount, 
      currency, 
      provider = 'creem',
      type = 'subscription',
      description,
      metadata,
      plan,
      productId
    } = body;

    // 如果使用 Creem，productId 是必需的
    if (provider === 'creem' && !productId) {
      return Response.json({
        success: false,
        error: 'productId is required for Creem payments'
      }, { status: 400 });
    }

    // 获取用户信息（从 session 或 token）
    // const user = await getCurrentUser(req);
    const user = {
      id: 'user_123',
      email: 'user@example.com',
      name: 'Test User'
    };

    // 构建订单
    const order: any = {
      type: type === 'subscription' ? PaymentType.SUBSCRIPTION : PaymentType.ONE_TIME,
      productId: productId, // Creem 需要
      requestId: `${user.id}_${Date.now()}`, // 唯一请求 ID
      description: description || 'SoloBoard Subscription',
      customer: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
      metadata: {
        userId: user.id,
        planName: plan?.name,
        ...metadata
      }
    };

    // 如果不是 Creem，添加价格信息
    if (provider !== 'creem') {
      if (!amount || !currency) {
        return Response.json({
          success: false,
          error: 'amount and currency are required'
        }, { status: 400 });
      }

      order.price = {
        amount: Math.round(amount),
        currency: currency.toLowerCase()
      };

      // 如果是订阅支付，添加计划信息
      if (type === 'subscription' && plan) {
        order.plan = {
          name: plan.name || 'Subscription Plan',
          description: plan.description,
          interval: plan.interval || PaymentInterval.MONTH,
          intervalCount: plan.intervalCount || 1,
          trialPeriodDays: plan.trialPeriodDays
        };
      }
    }

    // 创建支付会话
    const session = await paymentManager.createPayment({
      order,
      provider
    });

    return Response.json({
      success: true,
      checkoutUrl: session.checkoutInfo.checkoutUrl,
      sessionId: session.checkoutInfo.sessionId,
      provider: session.provider
    });

  } catch (error: any) {
    console.error('Payment creation error:', error);
    
    return Response.json({
      success: false,
      error: error.message || 'Failed to create payment'
    }, { status: 500 });
  }
}

// 查询支付状态
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const provider = searchParams.get('provider') || 'stripe';

    if (!sessionId) {
      return Response.json({
        success: false,
        error: 'sessionId is required'
      }, { status: 400 });
    }

    const paymentSession = await paymentManager.getPaymentSession({
      sessionId,
      provider
    });

    return Response.json({
      success: true,
      status: paymentSession?.paymentStatus,
      paymentInfo: paymentSession?.paymentInfo,
      subscriptionInfo: paymentSession?.subscriptionInfo
    });

  } catch (error: any) {
    console.error('Payment query error:', error);
    
    return Response.json({
      success: false,
      error: error.message || 'Failed to query payment'
    }, { status: 500 });
  }
}










