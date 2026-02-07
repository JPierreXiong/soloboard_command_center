/**
 * Digital Heirloom 邮件发送服务
 * 集成 Resend API，发送心跳预警、提醒和继承通知邮件
 */

import { getEmailService } from '@/shared/services/email';
import { getUuid } from '@/shared/lib/hash';
import { db } from '@/core/db';
import { emailNotifications } from '@/config/db/schema';
import {
  getHeartbeatWarningEmailTemplate,
  getHeartbeatReminderEmailTemplate,
  getInheritanceNoticeEmailTemplate,
  type EmailLanguage,
} from './email-templates';
import { getAllConfigs } from '@/shared/models/config';

/**
 * 发送心跳预警邮件
 */
export async function sendHeartbeatWarningEmail(
  vaultId: string,
  userEmail: string,
  userName: string,
  daysSinceLastSeen: number,
  heartbeatFrequency: number,
  gracePeriod: number,
  verificationToken: string,
  language: EmailLanguage = 'en'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const configs = await getAllConfigs();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.digitalheirloom.app';
    const confirmLink = `${appUrl}/api/digital-heirloom/heartbeat/confirm?token=${verificationToken}`;

    const template = getHeartbeatWarningEmailTemplate(
      {
        userName,
        daysSinceLastSeen,
        heartbeatFrequency,
        gracePeriod,
        confirmLink,
        vaultId,
      },
      language
    );

    const emailService = await getEmailService();
    const result = await emailService.sendEmail({
      to: userEmail,
      from: configs.resend_sender_email || 'support@digitalheirloom.app',
      subject: template.subject,
      html: template.html,
      tags: ['heartbeat_warning', 'digital_heirloom'],
    });

    // 记录邮件发送日志（如果失败不影响邮件发送）
    try {
      const notificationId = getUuid();
      await db()
        .insert(emailNotifications)
        .values({
          id: notificationId,
          vaultId,
          recipientEmail: userEmail,
          recipientType: 'user',
          emailType: 'heartbeat_warning',
          subject: template.subject,
          status: result.success ? 'sent' : 'failed',
          resendMessageId: result.messageId,
          errorMessage: result.error,
        });
    } catch (logError: any) {
      // 日志记录失败不影响邮件发送结果
      console.warn('Failed to log email notification:', logError.message);
    }

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  } catch (error: any) {
    console.error('Failed to send heartbeat warning email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

/**
 * 发送心跳提醒邮件（宽限期倒计时）
 */
export async function sendHeartbeatReminderEmail(
  vaultId: string,
  userEmail: string,
  userName: string,
  daysSinceLastSeen: number,
  hoursRemaining: number,
  verificationToken: string,
  language: EmailLanguage = 'en'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const configs = await getAllConfigs();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.digitalheirloom.app';
    const confirmLink = `${appUrl}/api/digital-heirloom/heartbeat/confirm?token=${verificationToken}`;

    const template = getHeartbeatReminderEmailTemplate(
      {
        userName,
        daysSinceLastSeen,
        hoursRemaining,
        confirmLink,
        vaultId,
      },
      language
    );

    const emailService = await getEmailService();
    const result = await emailService.sendEmail({
      to: userEmail,
      from: configs.resend_sender_email || 'support@digitalheirloom.app',
      subject: template.subject,
      html: template.html,
      tags: ['heartbeat_reminder', 'digital_heirloom'],
    });

    // 记录邮件发送日志（如果失败不影响邮件发送）
    try {
      const notificationId = getUuid();
      await db()
        .insert(emailNotifications)
        .values({
          id: notificationId,
          vaultId,
          recipientEmail: userEmail,
          recipientType: 'user',
          emailType: 'heartbeat_reminder',
          subject: template.subject,
          status: result.success ? 'sent' : 'failed',
          resendMessageId: result.messageId,
          errorMessage: result.error,
        });
    } catch (logError: any) {
      // 日志记录失败不影响邮件发送结果
      console.warn('Failed to log email notification:', logError.message);
    }

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  } catch (error: any) {
    console.error('Failed to send heartbeat reminder email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

/**
 * 发送继承通知邮件给受益人
 */
export async function sendInheritanceNoticeEmail(
  vaultId: string,
  beneficiaryEmail: string,
  beneficiaryName: string,
  userName: string,
  releaseToken: string,
  shippingTrackingNumber?: string,
  shippingCarrier?: string,
  language: EmailLanguage = 'en'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.digitalheirloom.app';
    const unlockLink = `${appUrl}/unlock?token=${releaseToken}`;

    const template = getInheritanceNoticeEmailTemplate(
      {
        beneficiaryName,
        userName,
        releaseToken,
        unlockLink,
        shippingTrackingNumber,
        shippingCarrier,
      },
      language
    );

    const configs = await getAllConfigs();
    const emailService = await getEmailService();
    const result = await emailService.sendEmail({
      to: beneficiaryEmail,
      from: configs.resend_sender_email || 'support@digitalheirloom.app',
      subject: template.subject,
      html: template.html,
      tags: ['inheritance_notice', 'digital_heirloom'],
    });

    // 记录邮件发送日志（如果失败不影响邮件发送）
    try {
      const notificationId = getUuid();
      await db()
        .insert(emailNotifications)
        .values({
          id: notificationId,
          vaultId,
          recipientEmail: beneficiaryEmail,
          recipientType: 'beneficiary',
          emailType: 'inheritance_notice',
          subject: template.subject,
          status: result.success ? 'sent' : 'failed',
          resendMessageId: result.messageId,
          errorMessage: result.error,
        });
    } catch (logError: any) {
      // 日志记录失败不影响邮件发送结果
      console.warn('Failed to log email notification:', logError.message);
    }

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  } catch (error: any) {
    console.error('Failed to send inheritance notice email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}
