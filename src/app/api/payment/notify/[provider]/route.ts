import { PaymentEventType, SubscriptionCycleType } from '@/extensions/payment';
import { findOrderByOrderNo } from '@/shared/models/order';
import { findSubscriptionByProviderSubscriptionId } from '@/shared/models/subscription';
import {
  getPaymentService,
  handleCheckoutSuccess,
  handleSubscriptionCanceled,
  handleSubscriptionRenewal,
  handleSubscriptionUpdated,
} from '@/shared/services/payment';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    if (!provider) {
      throw new Error('provider is required');
    }

    const paymentService = await getPaymentService();
    const paymentProvider = paymentService.getProvider(provider);
    if (!paymentProvider) {
      throw new Error('payment provider not found');
    }

    // get payment event from webhook notification
    const event = await paymentProvider.getPaymentEvent({ req });
    if (!event) {
      throw new Error('payment event not found');
    }

    const eventType = event.eventType;
    if (!eventType) {
      throw new Error('event type not found');
    }

    // payment session
    const session = event.paymentSession;
    if (!session) {
      throw new Error('payment session not found');
    }

    // console.log('notify payment session', session);

    if (eventType === PaymentEventType.CHECKOUT_SUCCESS) {
      // Check if this is a shipping fee payment
      if (session.metadata?.type === 'shipping_fee' && session.metadata?.shipping_log_id) {
        // Handle shipping fee payment
        const { updateShippingFeeStatus } = await import('@/shared/models/shipping-log');
        const { ShippingFeeStatus } = await import('@/shared/models/shipping-log');
        const { getEmailService } = await import('@/shared/services/email');
        const { getAllConfigs } = await import('@/shared/models/config');
        const { findShippingLogById } = await import('@/shared/models/shipping-log');
        const { findBeneficiaryById } = await import('@/shared/models/beneficiary');

        const shippingLogId = session.metadata.shipping_log_id as string;
        const shippingLog = await findShippingLogById(shippingLogId);

        if (shippingLog) {
          // Update shipping fee status
          // Get checkout ID from paymentInfo.transactionId or metadata
          const checkoutId = session.paymentInfo?.transactionId || session.metadata?.checkoutId || undefined;
          await updateShippingFeeStatus(
            shippingLogId,
            ShippingFeeStatus.PAID,
            checkoutId,
            new Date()
          );

          // Send notification email to beneficiary and admin
          const beneficiary = await findBeneficiaryById(shippingLog.beneficiaryId);
          if (beneficiary) {
            const emailService = await getEmailService();
            const configs = await getAllConfigs();
            const language = beneficiary.language || 'en';

            // Send payment success notification
            const emailContent = getShippingPaymentSuccessEmailContent(language, beneficiary.name);
            await emailService.sendEmail({
              to: beneficiary.email,
              from: configs.resend_sender_email || 'support@afterglow.so',
              subject: emailContent.subject,
              html: emailContent.html,
            });
          }
        }
      } else {
        // Regular order payment
        const orderNo = session.metadata.order_no;

        if (!orderNo) {
          throw new Error('order no not found');
        }

        const order = await findOrderByOrderNo(orderNo);
        if (!order) {
          throw new Error('order not found');
        }

        await handleCheckoutSuccess({
          order,
          session,
        });
      }
    } else if (eventType === PaymentEventType.PAYMENT_SUCCESS) {
      // only handle subscription payment
      if (session.subscriptionId && session.subscriptionInfo) {
        if (
          session.paymentInfo?.subscriptionCycleType ===
          SubscriptionCycleType.RENEWAL
        ) {
          // only handle subscription renewal payment
          const existingSubscription =
            await findSubscriptionByProviderSubscriptionId({
              provider: provider,
              subscriptionId: session.subscriptionId,
            });
          if (!existingSubscription) {
            throw new Error('subscription not found');
          }

          // handle subscription renewal payment
          await handleSubscriptionRenewal({
            subscription: existingSubscription,
            session,
          });
        } else {
          console.log('not handle subscription first payment');
        }
      } else {
        console.log('not handle one-time payment');
      }
    } else if (eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
      // only handle subscription update
      if (!session.subscriptionId || !session.subscriptionInfo) {
        throw new Error('subscription id or subscription info not found');
      }

      const existingSubscription =
        await findSubscriptionByProviderSubscriptionId({
          provider: provider,
          subscriptionId: session.subscriptionId,
        });
      if (!existingSubscription) {
        throw new Error('subscription not found');
      }

      await handleSubscriptionUpdated({
        subscription: existingSubscription,
        session,
      });
    } else if (eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
      // only handle subscription cancellation
      if (!session.subscriptionId || !session.subscriptionInfo) {
        throw new Error('subscription id or subscription info not found');
      }

      const existingSubscription =
        await findSubscriptionByProviderSubscriptionId({
          provider: provider,
          subscriptionId: session.subscriptionId,
        });
      if (!existingSubscription) {
        throw new Error('subscription not found');
      }

      await handleSubscriptionCanceled({
        subscription: existingSubscription,
        session,
      });
    } else {
      console.log('not handle other event type: ' + eventType);
    }

    return Response.json({
      message: 'success',
    });
  } catch (err: any) {
    console.log('handle payment notify failed', err);
    return Response.json(
      {
        message: `handle payment notify failed: ${err.message}`,
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * 获取运费支付成功邮件内容（多语言）
 */
function getShippingPaymentSuccessEmailContent(language: string, beneficiaryName: string) {
  const translations: Record<string, { subject: string; html: string }> = {
    zh: {
      subject: '运费支付成功 - 发货程序已启动',
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">运费支付成功</h2>
          <p>您好 ${beneficiaryName}，</p>
          <p>您的运费支付已成功确认。系统已自动通知管理员，发货程序即将启动。</p>
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            我们将在发货后通过邮件发送物流追踪信息。如有疑问，请联系客服。
          </p>
        </div>
      `,
    },
    en: {
      subject: 'Shipping Fee Payment Successful - Shipping Process Initiated',
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Payment Successful</h2>
          <p>Hello ${beneficiaryName},</p>
          <p>Your shipping fee payment has been successfully confirmed. The system has automatically notified the administrator, and the shipping process will begin shortly.</p>
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            We will send you tracking information via email once the shipment is dispatched. If you have any questions, please contact support.
          </p>
        </div>
      `,
    },
    fr: {
      subject: 'Paiement des frais d\'expédition réussi - Processus d\'expédition lancé',
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Paiement réussi</h2>
          <p>Bonjour ${beneficiaryName},</p>
          <p>Votre paiement des frais d'expédition a été confirmé avec succès. Le système a automatiquement notifié l'administrateur et le processus d'expédition va commencer sous peu.</p>
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            Nous vous enverrons les informations de suivi par e-mail une fois l'expédition effectuée. Si vous avez des questions, veuillez contacter le support.
          </p>
        </div>
      `,
    },
  };

  return translations[language] || translations.en;
}
