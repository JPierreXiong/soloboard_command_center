import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminAccess } from '@/core/rbac/permission';
import { db } from '@/core/db';
import { shippingLogs, beneficiaries } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { updateShippingLog, ShippingFeeStatus, ShippingStatus } from '@/shared/models/shipping-log';
import { getPaymentProvider } from '@/shared/services/payment';
import { getEmailService } from '@/shared/services/email';
import { getAllConfigs } from '@/shared/models/config';

const requestSchema = z.object({
  logId: z.string(),
  amount: z.number().positive(),
});

/**
 * 请求运费支付
 * POST /api/admin/shipping/request-payment
 */
export async function POST(req: Request) {
  try {
    // 检查管理员权限
    await requireAdminAccess({});

    const body = await req.json();
    const { logId, amount } = requestSchema.parse(body);

    // 1. 获取物流记录和受益人信息
    const [log] = await db()
      .select({
        log: shippingLogs,
        beneficiary: beneficiaries,
      })
      .from(shippingLogs)
      .innerJoin(beneficiaries, eq(shippingLogs.beneficiaryId, beneficiaries.id))
      .where(eq(shippingLogs.id, logId));

    if (!log) {
      return NextResponse.json(
        { error: 'Shipping log not found' },
        { status: 404 }
      );
    }

    // 2. 获取配置
    const configs = await getAllConfigs();
    const shippingFeeProductId = configs.creem_shipping_fee_product_id || process.env.CREEM_SHIPPING_FEE_PRODUCT_ID;

    if (!shippingFeeProductId) {
      return NextResponse.json(
        { error: 'Shipping fee product ID not configured' },
        { status: 500 }
      );
    }

    // 3. 创建 Creem 支付链接
    const paymentProvider = await getPaymentProvider('creem');
    if (!paymentProvider) {
      return NextResponse.json(
        { error: 'Creem payment provider not configured' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterglow.so';
    const checkout = await paymentProvider.createPayment({
      order: {
        productId: shippingFeeProductId,
        price: {
          amount: Math.round(amount * 100), // 转换为分
          currency: 'USD',
        },
        customer: {
          email: log.beneficiary.email,
          name: log.beneficiary.name,
        },
        metadata: {
          type: 'shipping_fee',
          shipping_log_id: logId,
          vault_id: log.log.vaultId,
        },
        successUrl: `${baseUrl}/shipping/payment-success`,
        cancelUrl: `${baseUrl}/shipping/payment-cancelled`,
      },
    });

    // 4. 更新物流记录
    await updateShippingLog(logId, {
      shippingFeeStatus: ShippingFeeStatus.PENDING_PAYMENT,
      finalAmount: Math.round(amount * 100),
      creemPaymentLink: checkout.checkoutInfo.checkoutUrl,
      creemCheckoutId: checkout.checkoutInfo.sessionId,
      paymentRequestedAt: new Date(),
      status: ShippingStatus.WAITING_PAYMENT,
    });

    // 5. 发送邮件给受益人
    const emailService = await getEmailService();
    const language = log.beneficiary.language || 'en';
    
    // 多语言邮件内容
    const emailContent = getShippingPaymentEmailContent(
      language,
      log.beneficiary.name,
      amount,
      checkout.checkoutInfo.checkoutUrl
    );

    await emailService.sendEmail({
      to: log.beneficiary.email,
      from: configs.resend_sender_email || 'support@afterglow.so',
      subject: emailContent.subject,
      html: emailContent.html,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkout.checkoutInfo.checkoutUrl,
      message: 'Payment link sent to beneficiary',
    });
  } catch (error) {
    console.error('Request shipping payment error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to request payment' },
      { status: 500 }
    );
  }
}

/**
 * 获取运费支付邮件内容（多语言）
 */
function getShippingPaymentEmailContent(
  language: string,
  beneficiaryName: string,
  amount: number,
  paymentUrl: string
) {
  const translations: Record<string, { subject: string; html: string }> = {
    zh: {
      subject: '遗产物理资产交付通知 - 需要支付物流费用',
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">遗产物理资产交付通知</h2>
          <p>您好 ${beneficiaryName}，</p>
          <p>我们已经准备好为您寄送持有人预留的物理资产。</p>
          <p>由于涉及跨境或特殊物流，需要您补缴物流费用：<strong style="color: #2563eb; font-size: 18px;">$${amount.toFixed(2)}</strong></p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${paymentUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
              立即支付运费
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            支付完成后，系统将自动通知管理员执行发货程序。如有疑问，请联系客服。
          </p>
        </div>
      `,
    },
    en: {
      subject: 'Action Required: Physical Asset Delivery Logistics Fee',
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Physical Asset Delivery Notification</h2>
          <p>Hello ${beneficiaryName},</p>
          <p>We are ready to ship the physical asset that was reserved for you.</p>
          <p>Due to cross-border or special logistics, you need to pay the shipping fee: <strong style="color: #2563eb; font-size: 18px;">$${amount.toFixed(2)}</strong></p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${paymentUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
              Pay Shipping Fee Now
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            After payment is completed, the system will automatically notify the administrator to proceed with shipping. If you have any questions, please contact support.
          </p>
        </div>
      `,
    },
    fr: {
      subject: 'Action requise : Frais de livraison d\'actif physique',
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Notification de livraison d'actif physique</h2>
          <p>Bonjour ${beneficiaryName},</p>
          <p>Nous sommes prêts à expédier l'actif physique qui vous a été réservé.</p>
          <p>En raison de la logistique transfrontalière ou spéciale, vous devez payer les frais d'expédition : <strong style="color: #2563eb; font-size: 18px;">$${amount.toFixed(2)}</strong></p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${paymentUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
              Payer les frais d'expédition maintenant
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            Une fois le paiement terminé, le système notifiera automatiquement l'administrateur pour procéder à l'expédition. Si vous avez des questions, veuillez contacter le support.
          </p>
        </div>
      `,
    },
  };

  return translations[language] || translations.en;
}




