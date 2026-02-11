/**
 * SoloBoard - 告警配置
 * 
 * 定义不同类型的告警和阈值
 */

export interface AlertConfig {
  type: 'site_down' | 'high_error_rate' | 'revenue_drop' | 'api_quota_warning';
  severity: 'info' | 'warning' | 'critical';
  threshold?: number;
  enabled: boolean;
}

export const DEFAULT_ALERTS: AlertConfig[] = [
  {
    type: 'site_down',
    severity: 'critical',
    enabled: true,
  },
  {
    type: 'high_error_rate',
    severity: 'warning',
    threshold: 10, // 10% error rate
    enabled: true,
  },
  {
    type: 'revenue_drop',
    severity: 'warning',
    threshold: 30, // 30% drop
    enabled: true,
  },
  {
    type: 'api_quota_warning',
    severity: 'info',
    threshold: 80, // 80% of quota
    enabled: true,
  },
];

/**
 * API 配额限制（每日）
 */
export const API_QUOTA_LIMITS: Record<string, number> = {
  GA4: 25000, // Google Analytics 4 免费额度
  STRIPE: 100000, // Stripe 无限制，设置一个高值
  UPTIME: 10000,
  LEMON_SQUEEZY: 10000,
  SHOPIFY: 10000,
};

/**
 * 告警冷却时间（分钟）
 * 防止同一告警在短时间内重复发送
 */
export const ALERT_COOLDOWN_MINUTES: Record<string, number> = {
  site_down: 30, // 30 分钟
  high_error_rate: 60, // 1 小时
  revenue_drop: 120, // 2 小时
  api_quota_warning: 240, // 4 小时
};

