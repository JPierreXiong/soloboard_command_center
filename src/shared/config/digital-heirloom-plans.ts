/**
 * Digital Heirloom Plan Configuration
 * 定义 Free/Base/Pro 三档会员体系的专用限制
 */

export interface DigitalHeirloomPlanConfig {
  name: string;
  storageLimit: number; // 字节数
  maxBeneficiaries: number;
  heartbeatFrequency: {
    min: number; // 最小天数
    max: number; // 最大天数
    default: number; // 默认天数
  };
  autoMonitoring: boolean; // 是否自动监控
  physicalShipping: boolean; // 是否支持物理寄送
  decryptionSpeed: 'slow' | 'normal' | 'priority'; // 解密速度（相同）
  decryptionLimit: number | null; // 解密次数限制（Free=1, Base/Pro=null=unlimited）
  manualCheckinRequired: boolean; // Free 用户需要手动签到
  checkinInterval: number; // 签到间隔（天数）
}

export const DIGITAL_HEIRLOOM_PLANS: Record<'free' | 'base' | 'pro', DigitalHeirloomPlanConfig> = {
  free: {
    name: 'Free',
    storageLimit: 10 * 1024, // 10KB
    maxBeneficiaries: 1,
    heartbeatFrequency: { min: 180, max: 180, default: 180 },
    autoMonitoring: false,
    physicalShipping: false,
    decryptionSpeed: 'normal', // 解密速度相同
    decryptionLimit: 1, // Free 用户只有 1 次解密机会
    manualCheckinRequired: true,
    checkinInterval: 180,
  },
  base: {
    name: 'Base',
    storageLimit: 50 * 1024 * 1024, // 50MB
    maxBeneficiaries: 3,
    heartbeatFrequency: { min: 30, max: 365, default: 90 },
    autoMonitoring: true,
    physicalShipping: false,
    decryptionSpeed: 'normal', // 解密速度相同
    decryptionLimit: null, // Base 用户无限制
    manualCheckinRequired: false,
    checkinInterval: 0,
  },
  pro: {
    name: 'Pro',
    storageLimit: 2 * 1024 * 1024 * 1024, // 2GB
    maxBeneficiaries: 10,
    heartbeatFrequency: { min: 30, max: 365, default: 90 },
    autoMonitoring: true,
    physicalShipping: true,
    decryptionSpeed: 'normal', // 解密速度相同
    decryptionLimit: null, // Pro 用户无限制
    manualCheckinRequired: false,
    checkinInterval: 0,
  },
};

/**
 * Get Digital Heirloom plan configuration by plan type
 */
export function getDigitalHeirloomPlanConfig(planType: 'free' | 'base' | 'pro'): DigitalHeirloomPlanConfig {
  return DIGITAL_HEIRLOOM_PLANS[planType] || DIGITAL_HEIRLOOM_PLANS.free;
}

/**
 * Format storage limit for display
 */
export function formatStorageLimit(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
