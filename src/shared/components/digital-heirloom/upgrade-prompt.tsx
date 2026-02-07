/**
 * Upgrade Prompt Component
 * 升级提示组件
 * 
 * 功能：
 * 1. 在 Free 用户达到限制时显示升级提示
 * 2. 展示不同计划的对比
 * 3. 引导用户升级到 Base/Pro
 */

'use client';

import { useState } from 'react';
import { Crown, Zap, Shield, Check, X, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import Link from 'next/link';

export interface UpgradePromptProps {
  /**
   * 触发升级提示的原因
   */
  reason: 'storage_limit' | 'beneficiary_limit' | 'decryption_limit' | 'feature_locked';
  
  /**
   * 当前计划等级
   */
  currentPlan: 'free' | 'base' | 'pro';
  
  /**
   * 当前使用量（可选）
   */
  currentUsage?: {
    storage?: number;
    beneficiaries?: number;
    decryptionAttempts?: number;
  };
  
  /**
   * 限制值（可选）
   */
  limits?: {
    storage?: number;
    beneficiaries?: number;
    decryptionAttempts?: number;
  };
  
  /**
   * 是否显示为对话框（默认：true）
   */
  asDialog?: boolean;
  
  /**
   * 自定义触发按钮
   */
  trigger?: React.ReactNode;
}

const PLAN_FEATURES = {
  free: {
    name: 'Free',
    icon: Lock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    features: [
      { text: '10KB 存储空间', included: true },
      { text: '1 个受益人', included: true },
      { text: '1 次解密机会', included: true },
      { text: '手动签到（180天）', included: true },
      { text: '自动化监控', included: false },
      { text: '物理恢复包', included: false },
    ],
  },
  base: {
    name: 'Base',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    price: '$49/年',
    features: [
      { text: '50MB 存储空间', included: true },
      { text: '3 个受益人', included: true },
      { text: '无限解密次数', included: true },
      { text: '自动化监控', included: true },
      { text: '30-365 天心跳周期', included: true },
      { text: '物理恢复包', included: false },
    ],
  },
  pro: {
    name: 'Pro',
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    price: '$149/年',
    features: [
      { text: '2GB 存储空间', included: true },
      { text: '10 个受益人', included: true },
      { text: '无限解密次数', included: true },
      { text: '自动化监控', included: true },
      { text: '物理恢复包（Fragment A/B）', included: true },
      { text: 'ShipAny 物流集成', included: true },
      { text: '优先支持', included: true },
    ],
  },
};

export function UpgradePrompt({
  reason,
  currentPlan,
  currentUsage,
  limits,
  asDialog = true,
  trigger,
}: UpgradePromptProps) {
  const [open, setOpen] = useState(false);

  const getReasonMessage = () => {
    switch (reason) {
      case 'storage_limit':
        return {
          title: '存储空间不足',
          description: `您已达到 ${currentPlan === 'free' ? 'Free' : 'Base'} 计划的存储限制。升级到更高计划以获得更多存储空间。`,
        };
      case 'beneficiary_limit':
        return {
          title: '受益人数量已达上限',
          description: `您已达到 ${currentPlan === 'free' ? 'Free' : 'Base'} 计划的受益人数量限制。升级以添加更多受益人。`,
        };
      case 'decryption_limit':
        return {
          title: '解密次数已用完',
          description: '您已用完 Free 计划的解密次数。升级到 Base 或 Pro 计划以获得无限解密次数。',
        };
      case 'feature_locked':
        return {
          title: '功能已锁定',
          description: '此功能仅对 Base 或 Pro 用户开放。升级以解锁所有功能。',
        };
      default:
        return {
          title: '升级以解锁更多功能',
          description: '升级到更高计划以获得更多功能和更高的限制。',
        };
    }
  };

  const reasonInfo = getReasonMessage();

  const content = (
    <div className="space-y-6">
      {/* 原因说明 */}
      <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
              {reasonInfo.title}
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {reasonInfo.description}
            </p>
          </div>
        </div>
      </div>

      {/* 使用情况（如果有） */}
      {currentUsage && limits && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentUsage.storage !== undefined && limits.storage && (
            <div className="rounded-lg border p-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">存储使用</div>
              <div className="text-lg font-semibold mt-1">
                {formatBytes(currentUsage.storage)} / {formatBytes(limits.storage)}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, (currentUsage.storage / limits.storage) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
          {currentUsage.beneficiaries !== undefined && limits.beneficiaries && (
            <div className="rounded-lg border p-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">受益人</div>
              <div className="text-lg font-semibold mt-1">
                {currentUsage.beneficiaries} / {limits.beneficiaries}
              </div>
            </div>
          )}
          {currentUsage.decryptionAttempts !== undefined && limits.decryptionAttempts && (
            <div className="rounded-lg border p-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">解密次数</div>
              <div className="text-lg font-semibold mt-1">
                {currentUsage.decryptionAttempts} / {limits.decryptionAttempts}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 计划对比 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Base Plan */}
        <Card className={`relative ${currentPlan === 'base' ? 'ring-2 ring-blue-500' : ''}`}>
          {currentPlan === 'base' && (
            <Badge className="absolute top-4 right-4">当前计划</Badge>
          )}
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${PLAN_FEATURES.base.bgColor}`}>
                <PLAN_FEATURES.base.icon className={`h-5 w-5 ${PLAN_FEATURES.base.color}`} />
              </div>
              <div>
                <CardTitle>{PLAN_FEATURES.base.name}</CardTitle>
                <CardDescription>{PLAN_FEATURES.base.price}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {PLAN_FEATURES.base.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  {feature.included ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={feature.included ? '' : 'text-gray-400'}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
            {currentPlan !== 'base' && (
              <Button asChild className="w-full mt-4" variant={currentPlan === 'free' ? 'default' : 'outline'}>
                <Link href="/pricing?plan=base">
                  升级到 Base
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className={`relative ${currentPlan === 'pro' ? 'ring-2 ring-purple-500' : 'border-purple-200'}`}>
          {currentPlan === 'pro' && (
            <Badge className="absolute top-4 right-4">当前计划</Badge>
          )}
          {currentPlan !== 'pro' && (
            <Badge className="absolute top-4 right-4 bg-purple-600">推荐</Badge>
          )}
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${PLAN_FEATURES.pro.bgColor}`}>
                <PLAN_FEATURES.pro.icon className={`h-5 w-5 ${PLAN_FEATURES.pro.color}`} />
              </div>
              <div>
                <CardTitle>{PLAN_FEATURES.pro.name}</CardTitle>
                <CardDescription>{PLAN_FEATURES.pro.price}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {PLAN_FEATURES.pro.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  {feature.included ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={feature.included ? '' : 'text-gray-400'}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
            {currentPlan !== 'pro' && (
              <Button asChild className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
                <Link href="/pricing?plan=pro">
                  升级到 Pro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (asDialog) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>升级计划</DialogTitle>
            <DialogDescription>
              选择适合您需求的计划以解锁更多功能
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return <div className="space-y-4">{content}</div>;
}

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
