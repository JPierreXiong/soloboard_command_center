/**
 * Cron Job: System Health Check
 * 系统健康监控 Cron Job
 * 
 * 运行频率：每小时一次
 * 功能：监控业务指标异常，发送报警
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { db } from '@/core/db';
import { digitalVaults, emailNotifications, systemAlerts } from '@/config/db/schema';
import { sql, eq, gte } from 'drizzle-orm';
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
      type: 'business' | 'resource';
      category: string;
      message: string;
      data: any;
    }> = [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. 检查单日 TRIGGERED 状态用户异常激增
    const triggeredTodayResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(digitalVaults)
      .where(
        sql`${digitalVaults.status} = 'triggered' AND ${digitalVaults.deadManSwitchActivatedAt} >= ${today}`
      );
    
    const triggeredToday = Number(triggeredTodayResult[0]?.count || 0);
    const TRIGGERED_SPIKE_THRESHOLD = 50;

    if (triggeredToday > TRIGGERED_SPIKE_THRESHOLD) {
      alerts.push({
        level: 'critical',
        type: 'business',
        category: 'triggered_spike',
        message: `单日 TRIGGERED 状态用户异常激增：${triggeredToday} > ${TRIGGERED_SPIKE_THRESHOLD}`,
        data: {
          triggeredToday,
          threshold: TRIGGERED_SPIKE_THRESHOLD,
        },
      });
    }

    // 2. 检查邮件发送量和失败率
    const emailStatsResult = await db()
      .select({
        sentToday: sql<number>`count(*) filter (where ${emailNotifications.status} = 'sent' and ${emailNotifications.sentAt} >= ${today})`,
        failedToday: sql<number>`count(*) filter (where ${emailNotifications.status} = 'failed' and ${emailNotifications.sentAt} >= ${today})`,
        totalToday: sql<number>`count(*) filter (where ${emailNotifications.sentAt} >= ${today})`,
      })
      .from(emailNotifications);

    const emailStats = emailStatsResult[0] || {
      sentToday: 0,
      failedToday: 0,
      totalToday: 0,
    };

    const sentToday = Number(emailStats.sentToday || 0);
    const failedToday = Number(emailStats.failedToday || 0);
    const totalToday = Number(emailStats.totalToday || 0);
    const failureRate = totalToday > 0 ? failedToday / totalToday : 0;

    const EMAIL_DAILY_LIMIT = 1000;
    const EMAIL_FAILURE_RATE_THRESHOLD = 0.05;

    if (sentToday > EMAIL_DAILY_LIMIT) {
      alerts.push({
        level: 'critical',
        type: 'business',
        category: 'email_limit',
        message: `Resend 邮件发送量超过每日上限：${sentToday} > ${EMAIL_DAILY_LIMIT}`,
        data: {
          sentToday,
          threshold: EMAIL_DAILY_LIMIT,
        },
      });
    }

    if (failureRate > EMAIL_FAILURE_RATE_THRESHOLD) {
      alerts.push({
        level: 'warning',
        type: 'business',
        category: 'email_failure_rate',
        message: `邮件失败率超过阈值：${(failureRate * 100).toFixed(2)}% > ${(EMAIL_FAILURE_RATE_THRESHOLD * 100)}%`,
        data: {
          failureRate,
          failedToday,
          totalToday,
          threshold: EMAIL_FAILURE_RATE_THRESHOLD,
        },
      });
    }

    // 3. 记录报警到数据库
    if (alerts.length > 0) {
      for (const alert of alerts) {
        try {
          await db().insert(systemAlerts).values({
            id: getUuid(),
            level: alert.level,
            type: alert.type,
            category: alert.category,
            message: alert.message,
            alertData: alert.data,
            createdAt: now,
          });
        } catch (error: any) {
          console.error(`Failed to log alert (${alert.category}):`, error.message);
        }
      }
    }

    // 4. 发送通知（如果有严重报警）
    const criticalAlerts = alerts.filter(a => a.level === 'critical');
    if (criticalAlerts.length > 0) {
      await sendAlertNotifications(criticalAlerts, 'critical');
    }

    const warningAlerts = alerts.filter(a => a.level === 'warning');
    if (warningAlerts.length > 0) {
      await sendAlertNotifications(warningAlerts, 'warning');
    }

    return respData({
      checked: true,
      alertsFound: alerts.length,
      criticalAlerts: criticalAlerts.length,
      warningAlerts: warningAlerts.length,
    });
  } catch (error: any) {
    console.error('System health check failed:', error);
    return respErr(error.message || 'System health check failed');
  }
}

async function sendAlertNotifications(
  alerts: Array<{ level: string; category: string; message: string; data: any }>,
  severity: 'critical' | 'warning'
) {
  const alertMessages = alerts.map(alert => 
    `[${alert.level.toUpperCase()}] ${alert.category}\n${alert.message}\n数据: ${JSON.stringify(alert.data, null, 2)}`
  ).join('\n\n');

  const fullMessage = `[Digital Heirloom] 系统健康监控报警 - ${alerts.length} 个${severity === 'critical' ? '严重' : '警告'}问题\n\n${alertMessages}`;

  // 发送邮件
  try {
    const emailService = await getEmailService();
    const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'admin@example.com';
    const subject = `[Digital Heirloom] ${severity === 'critical' ? '严重' : '警告'}报警 - ${alerts.length} 个问题`;
    const html = `
      <h2>系统健康监控报警</h2>
      <p>检测到以下${severity === 'critical' ? '严重' : '警告'}问题：</p>
      <ul>
        ${alerts.map(alert => `
          <li>
            <strong>[${alert.level.toUpperCase()}] ${alert.category}</strong><br>
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

  // 发送到 Slack（如果配置）
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
  if (SLACK_WEBHOOK_URL) {
    try {
      await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullMessage,
          attachments: [{
            color: severity === 'critical' ? '#ff0000' : '#ffa500',
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

  // 发送到 Telegram（如果配置）
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
          text: `🚨 *${severity.toUpperCase()} ALERT*\n\n${fullMessage}`,
          parse_mode: 'Markdown',
        }),
      });
    } catch (error: any) {
      console.error('Failed to send Telegram alert:', error.message);
    }
  }
}
