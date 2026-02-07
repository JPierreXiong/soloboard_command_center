import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminAccess } from '@/core/rbac/permission';
import { findShippingLogById, updateShippingLog, ShippingStatus } from '@/shared/models/shipping-log';
import { findBeneficiaryById } from '@/shared/models/beneficiary';
import { getEmailService } from '@/shared/services/email';
import { getAllConfigs } from '@/shared/models/config';

const confirmSchema = z.object({
  logId: z.string(),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
});

/**
 * 确认发货
 * POST /api/admin/shipping/confirm-ship
 */
export async function POST(req: Request) {
  try {
    // 检查管理员权限
    await requireAdminAccess({});

    const body = await req.json();
    const { logId, trackingNumber, carrier } = confirmSchema.parse(body);

    // 1. 获取物流记录
    const log = await findShippingLogById(logId);
    if (!log) {
      return NextResponse.json(
        { error: 'Shipping log not found' },
        { status: 404 }
      );
    }

    // 2. 检查是否已支付运费
    if (log.shippingFeeStatus !== 'paid' && log.shippingFeeStatus !== 'waived') {
      return NextResponse.json(
        { error: 'Shipping fee must be paid before shipping' },
        { status: 400 }
      );
    }

    // 3. 更新物流状态
    await updateShippingLog(logId, {
      status: ShippingStatus.SHIPPED,
      trackingNumber: trackingNumber || log.trackingNumber,
      carrier: carrier || log.carrier || 'SF', // 默认顺丰
      shippedAt: new Date(),
    });

    // 4. 发送发货通知邮件给受益人
    const beneficiary = await findBeneficiaryById(log.beneficiaryId);
    if (beneficiary) {
      const emailService = await getEmailService();
      const configs = await getAllConfigs();
      const language = beneficiary.language || 'en';

      const emailContent = getShippingNotificationEmailContent(
        language,
        beneficiary.name,
        trackingNumber || log.trackingNumber || '',
        carrier || log.carrier || 'SF'
      );

      await emailService.sendEmail({
        to: beneficiary.email,
        from: configs.resend_sender_email || 'support@afterglow.so',
        subject: emailContent.subject,
        html: emailContent.html,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Shipping confirmed and notification sent',
    });
  } catch (error) {
    console.error('Confirm shipping error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm shipping' },
      { status: 500 }
    );
  }
}

/**
 * 获取发货通知邮件内容（多语言）
 */
function getShippingNotificationEmailContent(
  language: string,
  beneficiaryName: string,
  trackingNumber: string,
  carrier: string
) {
  const carrierNames: Record<string, { zh: string; en: string; fr: string }> = {
    SF: { zh: '顺丰速运', en: 'SF Express', fr: 'SF Express' },
    FedEx: { zh: '联邦快递', en: 'FedEx', fr: 'FedEx' },
    DHL: { zh: 'DHL', en: 'DHL', fr: 'DHL' },
  };

  const carrierName = carrierNames[carrier] || { zh: carrier, en: carrier, fr: carrier };

  const translations: Record<string, { subject: string; html: string }> = {
    zh: {
      subject: '物理资产已发货 - 物流追踪信息',
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">物理资产已发货</h2>
          <p>您好 ${beneficiaryName}，</p>
          <p>您申请的物理资产已成功发货。</p>
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>承运商：</strong>${carrierName.zh}</p>
            <p style="margin: 5px 0;"><strong>物流单号：</strong>${trackingNumber}</p>
          </div>
          <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
            <strong>重要提示：</strong>包裹内包含物理密钥，请配合数字恢复包使用以解密数字资产。请妥善保管，避免丢失。
          </p>
        </div>
      `,
    },
    en: {
      subject: 'Physical Asset Shipped - Tracking Information',
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Physical Asset Shipped</h2>
          <p>Hello ${beneficiaryName},</p>
          <p>Your requested physical asset has been successfully shipped.</p>
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Carrier:</strong> ${carrierName.en}</p>
            <p style="margin: 5px 0;"><strong>Tracking Number:</strong> ${trackingNumber}</p>
          </div>
          <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
            <strong>Important:</strong> The package contains a physical key. Please use it together with the digital recovery kit to decrypt the digital assets. Please keep it safe and avoid loss.
          </p>
        </div>
      `,
    },
    fr: {
      subject: 'Actif physique expédié - Informations de suivi',
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Actif physique expédié</h2>
          <p>Bonjour ${beneficiaryName},</p>
          <p>Votre actif physique demandé a été expédié avec succès.</p>
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Transporteur:</strong> ${carrierName.fr}</p>
            <p style="margin: 5px 0;"><strong>Numéro de suivi:</strong> ${trackingNumber}</p>
          </div>
          <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
            <strong>Important:</strong> Le colis contient une clé physique. Veuillez l'utiliser avec le kit de récupération numérique pour décrypter les actifs numériques. Veuillez le garder en sécurité et éviter la perte.
          </p>
        </div>
      `,
    },
  };

  return translations[language] || translations.en;
}




