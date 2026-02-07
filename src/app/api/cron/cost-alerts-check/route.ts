/**
 * Cron Job: Cost Alerts Check
 * 成本监控报警 Cron Job
 * 
 * 运行频率：每小时一次
 * 功能：监控成本指标，发送报警
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { db } from '@/core/db';
import { emailNotifications, digitalVaults, shippingLogs, systemAlerts } from '@/config/db/schema';
import { sql, gte } from 'drizzle-orm';
import { getEmailService } from '@/shared/services/email';
import { getUuid } from '@/shared/lib/hash';

// 验证 Cron Secret（如果配置）
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // 验证 Cron Secret（如果配置）
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return respErr('Unauthorized', 401);
    }

    const alerts: Array<{
      level: 'info' | 'warning' | 'critical';
      type: 'email' | 'storage' | 'shipping';
      message: string;
      data: any;
    }> = [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), now.getMonth() - 1, now.getDate());

    // 1. 检查邮件发送量
    const emailStats = await db()
      .select({
        sentToday: sql<number>`count(*) filter (where ${emailNotifications.status} = 'sent' and ${emailNotifications.sentAt} >= ${today})`,
        sentThisWeek: sql<number>`count(*) filter (where ${emailNotifications.status} = 'sent' and ${emailNotifications.sentAt} >= ${weekAgo})`,
        sentThisMonth: sql<number>`count(*) filter (where ${emailNotifications.status} = 'sent' and ${emailNotifications.sentAt} >= ${monthAgo})`,
        failedToday: sql<number>`count(*) filter (where ${emailNotifications.status} = 'failed' and ${emailNotifications.sentAt} >= ${today})`,
      })
      .from(emailNotifications);

    const stats = emailStats[0] || {
      sentToday: 0,
      sentThisWeek: 0,
      sentThisMonth: 0,
      failedToday: 0,
    };

    const ALERT_THRESHOLDS = {
      email: {
        daily: 500,
        weekly: 3000,
        monthly: 10000,
        warning: 0.8,
        critical: 0.9,
      },
      storage: {
        percentage: 90,
      },
      shipping: {
        daily: 10,
      },
    };

    if (Number(stats.sentToday || 0) > ALERT_THRESHOLDS.email.daily) {
      alerts.push({
        level: 'critical',
        type: 'email',
        message: `今日邮件发送量超过阈值：${stats.sentToday} > ${ALERT_THRESHOLDS.email.daily}`,
        data: stats,
      });
    } else if (Number(stats.sentToday || 0) > ALERT_THRESHOLDS.email.daily * ALERT_THRESHOLDS.email.warning) {
      alerts.push({
        level: 'warning',
        type: 'email',
        message: `今日邮件发送量接近阈值：${stats.sentToday} / ${ALERT_THRESHOLDS.email.daily}`,
        data: stats,
      });
    }

    if (Number(stats.sentThisMonth || 0) > ALERT_THRESHOLDS.email.monthly * ALERT_THRESHOLDS.email.critical) {
      alerts.push({
        level: 'critical',
        type: 'email',
        message: `本月邮件发送量超过严重阈值：${stats.sentThisMonth} > ${ALERT_THRESHOLDS.email.monthly * ALERT_THRESHOLDS.email.critical}`,
        data: stats,
      });
    }

    // 2. 检查存储使用量
    const storageStats = await db()
      .select({
        totalSize: sql<number>`sum(length(${digitalVaults.encryptedData}))`,
        vaultCount: sql<number>`count(*)`,
      })
      .from(digitalVaults);

    const storage = storageStats[0] || { totalSize: 0, vaultCount: 0 };
    const totalSizeMB = Number(storage.totalSize || 0) / (1024 * 1024);
    const STORAGE_LIMIT_MB = 10 * 1024; // 10GB
    const storagePercentage = (totalSizeMB / STORAGE_LIMIT_MB) * 100;

    if (storagePercentage > ALERT_THRESHOLDS.storage.percentage) {
      alerts.push({
        level: 'critical',
        type: 'storage',
        message: `存储使用率超过阈值：${storagePercentage.toFixed(2)}% > ${ALERT_THRESHOLDS.storage.percentage}%`,
        data: {
          totalSizeMB,
          storagePercentage,
          vaultCount: storage.vaultCount,
        },
      });
    }

    // 3. 检查 ShipAny 物流订单
    const shippingStats = await db()
      .select({
        ordersToday: sql<number>`count(*) filter (where ${shippingLogs.createdAt} >= ${today})`,
        ordersThisWeek: sql<number>`count(*) filter (where ${shippingLogs.createdAt} >= ${weekAgo})`,
      })
      .from(shippingLogs);

    const shipping = shippingStats[0] || { ordersToday: 0, ordersThisWeek: 0 };

    if (Number(shipping.ordersToday || 0) > ALERT_THRESHOLDS.shipping.daily) {
      alerts.push({
        level: 'warning',
        type: 'shipping',
        message: `今日物流订单超过阈值：${shipping.ordersToday} > ${ALERT_THRESHOLDS.shipping.daily}`,
        data: shipping,
      });
    }

    // 4. 记录报警到数据库
    if (alerts.length > 0) {
      for (const alert of alerts) {
        try {
          await db().insert(systemAlerts).values({
            id: getUuid(),
            level: alert.level,
            type: 'cost',
            category: alert.type,
            message: alert.message,
            alertData: alert.data,
            createdAt: now,
          });
        } catch (error: any) {
          console.error(`Failed to log alert (${alert.type}):`, error.message);
        }
      }
    }

    // 5. 发送报警通知（如果有严重报警）
    const criticalAlerts = alerts.filter(a => a.level === 'critical');
    if (criticalAlerts.length > 0) {
      await sendAlertEmail(criticalAlerts);
    }

    return respData({
      checked: true,
      alertsFound: alerts.length,
      criticalAlerts: criticalAlerts.length,
    });
  } catch (error: any) {
    console.error('Cost alerts check failed:', error);
    return respErr(error.message || 'Cost alerts check failed');
  }
}

async function sendAlertEmail(alerts: Array<{ level: string; type: string; message: string; data: any }>) {
  const alertMessages = alerts.map(alert => 
    `[${alert.level.toUpperCase()}] ${alert.type}\n${alert.message}\n数据: ${JSON.stringify(alert.data, null, 2)}`
  ).join('\n\n');

  const fullMessage = `[Digital Heirloom] 成本监控报警 - ${alerts.length} 个严重问题\n\n${alertMessages}`;

  // 1. 发送邮件
  try {
    const emailService = await getEmailService();
    const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'admin@example.com';
    const subject = `[Digital Heirloom] 成本监控报警 - ${alerts.length} 个严重问题`;
    const html = `
      <h2>成本监控报警</h2>
      <p>检测到以下严重问题：</p>
      <ul>
        ${alerts.map(alert => `
          <li>
            <strong>[${alert.level.toUpperCase()}] ${alert.type}</strong><br>
            ${alert.message}<br>
            <pre>${JSON.stringify(alert.data, null, 2)}</pre>
          </li>
        `).join('')}
      </ul>
      <p>请及时处理。</p>
    `;

    await emailService.sendEmail({
      to: ADMIN_EMAIL,
      subject,
      html,
    });
  } catch (error: any) {
    console.error('Failed to send alert email:', error.message);
  }

  // 2. 发送到 Slack（如果配置）
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
  if (SLACK_WEBHOOK_URL) {
    try {
      await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullMessage,
          attachments: [{
            color: '#ff0000',
            text: '详情请登录 Admin Dashboard 查看',
            footer: 'Digital Heirloom Admin',
            ts: Math.floor(Date.now() / 1000),
          }],
        }),
      });
    } catch (error: any) {
      console.error('Failed to send Slack alert:', error.message);
    }
  }

  // 3. 发送到 Telegram（如果配置）
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `🚨 *CRITICAL ALERT*\n\n${fullMessage}`,
          parse_mode: 'Markdown',
        }),
      });
    } catch (error: any) {
      console.error('Failed to send Telegram alert:', error.message);
    }
  }
}
