/**
 * 邮件批处理服务
 * 处理 Resend API 的频率限制，使用分批发送避免 Rate Limit
 */

import { getEmailService } from '@/shared/services/email';
import type { EmailMessage } from '@/extensions/email';

/**
 * Resend API 限制
 * - 每秒最多 10 个请求
 * - 每分钟最多 100 个请求
 */
const RATE_LIMIT = {
  perSecond: 10,
  perMinute: 100,
};

/**
 * 批处理配置
 */
const BATCH_CONFIG = {
  batchSize: 8, // 每批发送 8 封邮件（留有余量）
  delayBetweenBatches: 1100, // 批次间延迟 1.1 秒（确保不超过每秒限制）
};

/**
 * 批量发送邮件（带速率限制）
 * @param emails 邮件列表
 * @param onProgress 进度回调
 */
export async function sendEmailsInBatches(
  emails: EmailMessage[],
  onProgress?: (sent: number, total: number) => void
) {
  const emailService = await getEmailService();
  const total = emails.length;
  let sent = 0;
  const results: Array<{ success: boolean; error?: string }> = [];

  // 分批处理
  for (let i = 0; i < emails.length; i += BATCH_CONFIG.batchSize) {
    const batch = emails.slice(i, i + BATCH_CONFIG.batchSize);

    // 并发发送当前批次
    const batchPromises = batch.map(async (email) => {
      try {
        const result = await emailService.sendEmail(email);
        sent++;
        if (onProgress) {
          onProgress(sent, total);
        }
        return { success: result.success, error: result.error };
      } catch (error: any) {
        sent++;
        if (onProgress) {
          onProgress(sent, total);
        }
        return {
          success: false,
          error: error.message || 'Unknown error',
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // 如果不是最后一批，等待一段时间再发送下一批
    if (i + BATCH_CONFIG.batchSize < emails.length) {
      await new Promise((resolve) =>
        setTimeout(resolve, BATCH_CONFIG.delayBetweenBatches)
      );
    }
  }

  return {
    total,
    sent,
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

/**
 * 安全发送单封邮件（带重试机制）
 */
export async function sendEmailWithRetry(
  email: EmailMessage,
  maxRetries = 3
): Promise<{ success: boolean; error?: string }> {
  const emailService = await getEmailService();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await emailService.sendEmail(email);
      if (result.success) {
        return { success: true };
      }

      // 如果是最后一次尝试，返回错误
      if (attempt === maxRetries) {
        return { success: false, error: result.error };
      }

      // 等待后重试（指数退避）
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    } catch (error: any) {
      if (attempt === maxRetries) {
        return { success: false, error: error.message || 'Unknown error' };
      }

      // 等待后重试
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}




