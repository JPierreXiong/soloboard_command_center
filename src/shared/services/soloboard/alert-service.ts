/**
 * SoloBoard - 告警服务
 * 
 * 负责发送邮件告警和记录告警日志
 */

import { Resend } from 'resend';
import { db } from '@/core/db';
import { alertLogs, user as userTable, monitoredSites } from '@/config/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getPlanLimits, type PlanType } from '@/config/plans';
import { ALERT_COOLDOWN_MINUTES } from '@/config/alerts';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface AlertData {
  userId: string;
  siteId?: string;
  alertType: 'site_down' | 'high_error_rate' | 'revenue_drop' | 'api_quota_warning';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metadata?: Record<string, any>;
}

/**
 * 发送告警邮件
 */
export async function sendAlert(alertData: AlertData): Promise<boolean> {
  try {
    // 1. 获取用户信息
    const user = await db()
      .select()
      .from(userTable)
      .where(eq(userTable.id, alertData.userId))
      .limit(1)
      .then((rows: any[]) => rows[0]);
    
    if (!user || !user.email) {
      console.error('User not found or no email:', alertData.userId);
      return false;
    }
    
    // 2. 检查用户计划是否支持邮件告警
    const planLimits = getPlanLimits(user.planType as PlanType);
    if (!planLimits.emailAlerts) {
      console.log(`Email alerts not available for ${user.planType} plan`);
      return false;
    }
    
    // 3. 检查冷却时间（防止重复告警）
    const cooldownMinutes = ALERT_COOLDOWN_MINUTES[alertData.alertType] || 30;
    const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000);
    
    const recentAlert = await db()
      .select()
      .from(alertLogs)
      .where(
        and(
          eq(alertLogs.userId, alertData.userId),
          eq(alertLogs.alertType, alertData.alertType),
          alertData.siteId ? eq(alertLogs.siteId, alertData.siteId) : undefined,
          gte(alertLogs.createdAt, cooldownTime)
        )
      )
      .limit(1)
      .then((rows: any[]) => rows[0]);
    
    if (recentAlert) {
      console.log(`Alert in cooldown period: ${alertData.alertType}`);
      return false;
    }
    
    // 4. 获取站点信息（如果有）
    let siteName = 'Unknown Site';
    if (alertData.siteId) {
      const site = await db()
        .select()
        .from(monitoredSites)
        .where(eq(monitoredSites.id, alertData.siteId))
        .limit(1)
        .then((rows: any[]) => rows[0]);
      
      if (site) {
        siteName = site.name;
      }
    }
    
    // 5. 生成邮件内容
    const emailContent = generateAlertEmail(alertData, siteName);
    
    // 6. 发送邮件
    await resend.emails.send({
      from: 'SoloBoard Alerts <alerts@soloboard.app>',
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
    });
    
    // 7. 记录告警日志
    await db().insert(alertLogs).values({
      id: nanoid(),
      userId: alertData.userId,
      siteId: alertData.siteId,
      alertType: alertData.alertType,
      severity: alertData.severity,
      message: alertData.message,
      metadata: alertData.metadata,
      sentAt: new Date(),
    });
    
    console.log(`✅ Alert sent to ${user.email}:`, alertData.alertType);
    return true;
  } catch (error) {
    console.error('Failed to send alert:', error);
    return false;
  }
}

/**
 * 生成告警邮件内容
 */
function generateAlertEmail(alertData: AlertData, siteName: string) {
  const severityColors = {
    info: '#3b82f6',
    warning: '#f59e0b',
    critical: '#ef4444',
  };
  
  const severityEmojis = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨',
  };
  
  const color = severityColors[alertData.severity];
  const emoji = severityEmojis[alertData.severity];
  
  let subject = '';
  let body = '';
  
  switch (alertData.alertType) {
    case 'site_down':
      subject = `${emoji} Site Down Alert: ${siteName}`;
      body = `
        <p>Your site <strong>${siteName}</strong> is currently down or unreachable.</p>
        <p><strong>Details:</strong> ${alertData.message}</p>
        <p>Please check your site immediately to restore service.</p>
      `;
      break;
      
    case 'high_error_rate':
      subject = `${emoji} High Error Rate Alert: ${siteName}`;
      body = `
        <p>Your site <strong>${siteName}</strong> is experiencing a high error rate.</p>
        <p><strong>Details:</strong> ${alertData.message}</p>
        <p>This may indicate a problem with your application or API integrations.</p>
      `;
      break;
      
    case 'revenue_drop':
      subject = `${emoji} Revenue Drop Alert: ${siteName}`;
      body = `
        <p>Significant revenue drop detected for <strong>${siteName}</strong>.</p>
        <p><strong>Details:</strong> ${alertData.message}</p>
        <p>Review your payment processing and checkout flow.</p>
      `;
      break;
      
    case 'api_quota_warning':
      subject = `${emoji} API Quota Warning: ${siteName}`;
      body = `
        <p>API quota warning for <strong>${siteName}</strong>.</p>
        <p><strong>Details:</strong> ${alertData.message}</p>
        <p>Consider upgrading your plan or optimizing API usage.</p>
      `;
      break;
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">${emoji} SoloBoard Alert</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        ${body}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <a href="https://soloboard.app/dashboard" style="display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Dashboard
          </a>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
          You received this alert because you have email notifications enabled for your SoloBoard account.
          <br>
          <a href="https://soloboard.app/settings" style="color: ${color};">Manage alert settings</a>
        </p>
      </div>
    </body>
    </html>
  `;
  
  return { subject, html };
}

/**
 * 检查站点健康状态并发送告警
 */
export async function checkSiteHealthAndAlert(siteId: string, userId: string) {
  try {
    const site = await db()
      .select()
      .from(monitoredSites)
      .where(eq(monitoredSites.id, siteId))
      .limit(1)
      .then((rows: any[]) => rows[0]);
    
    if (!site) return;
    
    // 检查站点是否宕机
    if (site.healthStatus === 'offline') {
      await sendAlert({
        userId,
        siteId,
        alertType: 'site_down',
        severity: 'critical',
        message: `Site ${site.name} is currently offline and unreachable.`,
        metadata: {
          url: site.url,
          lastChecked: new Date().toISOString(),
        },
      });
    }
    
    // 检查错误率（如果有快照数据）
    if (site.lastSnapshot?.metrics?.errorRate && site.lastSnapshot.metrics.errorRate > 10) {
      await sendAlert({
        userId,
        siteId,
        alertType: 'high_error_rate',
        severity: 'warning',
        message: `Error rate is ${site.lastSnapshot.metrics.errorRate}% (threshold: 10%)`,
        metadata: {
          errorRate: site.lastSnapshot.metrics.errorRate,
        },
      });
    }
  } catch (error) {
    console.error('Failed to check site health:', error);
  }
}
