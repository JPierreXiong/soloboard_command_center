/**
 * Feature Lock Component
 * 功能锁定组件
 * 
 * 功能：
 * 1. 根据计划等级锁定功能
 * 2. 显示锁定提示和升级按钮
 * 3. 提供统一的锁定 UI
 */

'use client';

import { ReactNode } from 'react';
import { Lock, Crown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { UpgradePrompt } from './upgrade-prompt';

export interface FeatureLockProps {
  /**
   * 当前计划等级
   */
  planLevel: 'free' | 'base' | 'pro';
  
  /**
   * 所需的最低计划等级
   */
  requiredPlan: 'free' | 'base' | 'pro';
  
  /**
   * 被锁定的内容
   */
  children: ReactNode;
  
  /**
   * 锁定时的提示信息
   */
  lockMessage?: string;
  
  /**
   * 是否显示为覆盖层（默认：true）
   */
  asOverlay?: boolean;
  
  /**
   * 自定义锁定图标
   */
  customIcon?: ReactNode;
}

const PLAN_HIERARCHY = {
  free: 0,
  base: 1,
  pro: 2,
};

export function FeatureLock({
  planLevel,
  requiredPlan,
  children,
  lockMessage,
  asOverlay = true,
  customIcon,
}: FeatureLockProps) {
  const currentLevel = PLAN_HIERARCHY[planLevel];
  const requiredLevel = PLAN_HIERARCHY[requiredPlan];
  const isLocked = currentLevel < requiredLevel;

  if (!isLocked) {
    return <>{children}</>;
  }

  const getUpgradePlan = (): 'base' | 'pro' => {
    if (requiredLevel === PLAN_HIERARCHY.pro) {
      return 'pro';
    }
    return 'base';
  };

  const defaultMessage = lockMessage || `此功能需要 ${requiredPlan === 'pro' ? 'Pro' : 'Base'} 计划`;

  if (asOverlay) {
    return (
      <div className="relative group">
        {/* 原始内容（模糊） */}
        <div className="blur-sm pointer-events-none select-none opacity-50">
          {children}
        </div>

        {/* 锁定覆盖层 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-center space-y-4 p-6">
            {customIcon || (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <Lock className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                功能已锁定
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {defaultMessage}
              </p>
            </div>
            <UpgradePrompt
              reason="feature_locked"
              currentPlan={planLevel}
              asDialog={true}
              trigger={
                <Button>
                  <Crown className="mr-2 h-4 w-4" />
                  升级到 {getUpgradePlan() === 'pro' ? 'Pro' : 'Base'}
                </Button>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  // 非覆盖层模式：显示提示和禁用状态
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <div className="pointer-events-none opacity-50">{children}</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="h-6 w-6 text-gray-400" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <p>{defaultMessage}</p>
            <UpgradePrompt
              reason="feature_locked"
              currentPlan={planLevel}
              asDialog={true}
              trigger={
                <Button size="sm" variant="outline" className="w-full">
                  升级
                </Button>
              }
            />
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * 功能锁定 Hook
 * 用于在组件中检查功能是否可用
 */
export function useFeatureLock(
  planLevel: 'free' | 'base' | 'pro',
  requiredPlan: 'free' | 'base' | 'pro'
) {
  const currentLevel = PLAN_HIERARCHY[planLevel];
  const requiredLevel = PLAN_HIERARCHY[requiredPlan];
  const isLocked = currentLevel < requiredLevel;

  return {
    isLocked,
    canAccess: !isLocked,
    requiredPlan,
    currentPlan: planLevel,
  };
}
