/**
 * SoloBoard - 订阅计划配置
 * 
 * 定义不同计划的限制和功能
 */

export const PLAN_LIMITS = {
  starter: {
    maxSites: 1,
    refreshInterval: 48 * 60, // 48 hours in minutes
    dataRetention: 7, // days
    emailAlerts: false,
    apiAccess: false,
    whiteLabel: false,
    teamCollaboration: false,
    features: ['basic_dashboard', 'community_support'],
    price: 0,
    priceMonthly: 0,
    priceYearly: 0,
  },
  base: {
    maxSites: 5,
    refreshInterval: 6 * 60, // 6 hours in minutes
    dataRetention: 365, // 1 year
    emailAlerts: true,
    apiAccess: false,
    whiteLabel: false,
    teamCollaboration: false,
    features: [
      'advanced_analytics',
      'email_alerts',
      'priority_support',
      'all_data_sources',
    ],
    price: 19,
    priceMonthly: 19,
    priceYearly: 190, // 2 months free
  },
  pro: {
    maxSites: 10,
    refreshInterval: 60, // 60 minutes
    dataRetention: -1, // permanent
    emailAlerts: true,
    apiAccess: true,
    whiteLabel: true,
    teamCollaboration: true,
    features: [
      'real_time_sync',
      'white_label',
      'team_collaboration',
      'api_access',
      'dedicated_support',
      'permanent_history',
    ],
    price: 39,
    priceMonthly: 39,
    priceYearly: 390, // 2 months free
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

/**
 * 获取计划限制
 */
export function getPlanLimits(planType: PlanType = 'starter') {
  return PLAN_LIMITS[planType] || PLAN_LIMITS.starter;
}

/**
 * 检查用户是否可以使用某个功能
 */
export function canUseFeature(
  planType: PlanType,
  feature: string
): boolean {
  const plan = getPlanLimits(planType);
  return (plan.features as readonly string[]).includes(feature);
}

/**
 * 获取计划显示名称
 */
export function getPlanDisplayName(planType: PlanType): string {
  const names: Record<PlanType, string> = {
    starter: 'Starter',
    base: 'Base',
    pro: 'Pro',
  };
  return names[planType] || 'Starter';
}

/**
 * 获取推荐升级的计划
 */
export function getRecommendedUpgrade(currentPlan: PlanType): PlanType | null {
  if (currentPlan === 'starter') return 'base';
  if (currentPlan === 'base') return 'pro';
  return null;
}

