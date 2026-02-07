/**
 * Stats Cards Component
 * 统计卡片组件
 * 
 * 功能：显示关键统计指标
 */

'use client';

import React from 'react';
import { AlertTriangle, Users, Mail, Package, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { CostAlertGauge } from './cost-alert-gauge';

interface DashboardStats {
  totalVaults: number;
  activeVaults: number;
  pendingVerification: number;
  triggeredToday: number;
  urgentVaults: {
    total: number;
    byPlan: {
      free: number;
      base: number;
      pro: number;
    };
  };
  planDistribution: {
    free: number;
    base: number;
    pro: number;
  };
  potentialConversion: {
    userCount: number;
    estimatedValue: number;
    basePlanPrice: number;
  };
  weeklyTrend: {
    newVaults: number[];
    triggeredVaults: number[];
  };
  emailStats: {
    sentToday: number;
    openedToday: number;
    clickedToday: number;
    failedToday: number;
  };
  storageStats: {
    totalEncryptedSize: number;
    averageVaultSize: number;
  };
  shippingOrders: number;
}

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="space-y-6">
      {/* 高风险预警卡片 */}
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            高风险预警
          </CardTitle>
          <CardDescription>需要立即关注的金库</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-4">
            <div>
              <div className="text-4xl font-bold text-red-600">{stats.urgentVaults.total}</div>
              <div className="text-sm text-gray-600 mt-1">剩余时间 &lt; 48 小时</div>
            </div>
            <div className="flex gap-2">
              {stats.urgentVaults.byPlan.pro > 0 && (
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                  Pro: {stats.urgentVaults.byPlan.pro}
                </Badge>
              )}
              {stats.urgentVaults.byPlan.base > 0 && (
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                  Base: {stats.urgentVaults.byPlan.base}
                </Badge>
              )}
              {stats.urgentVaults.byPlan.free > 0 && (
                <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                  Free: {stats.urgentVaults.byPlan.free}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 核心统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">总金库数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVaults}</div>
            <div className="text-xs text-gray-500 mt-1">
              活跃: {stats.activeVaults}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">待验证</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingVerification}</div>
            <div className="text-xs text-gray-500 mt-1">
              今日触发: {stats.triggeredToday}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <Mail className="h-4 w-4" />
              邮件发送
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emailStats.sentToday}</div>
            <div className="text-xs text-gray-500 mt-1">
              失败: {stats.emailStats.failedToday}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <Package className="h-4 w-4" />
              物流订单
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shippingOrders}</div>
            <div className="text-xs text-gray-500 mt-1">
              Pro 用户订单
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 潜在转化价值卡片 */}
      {stats.potentialConversion.userCount > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <TrendingUp className="h-5 w-5" />
              潜在转化价值
            </CardTitle>
            <CardDescription>Free 用户中已使用解密的用户</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4">
              <div>
                <div className="text-3xl font-bold text-green-600">
                  ${stats.potentialConversion.estimatedValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {stats.potentialConversion.userCount} 个潜在用户 × ${stats.potentialConversion.basePlanPrice}/年
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 计划分布 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">计划分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.planDistribution.free}</div>
              <div className="text-xs text-gray-500">Free</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.planDistribution.base}</div>
              <div className="text-xs text-gray-500">Base</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.planDistribution.pro}</div>
              <div className="text-xs text-gray-500">Pro</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 成本监控仪表盘 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CostAlertGauge
          label="邮件发送量（今日）"
          current={stats.emailStats.sentToday}
          total={1000}
          unit="封"
        />
        <CostAlertGauge
          label="存储使用量"
          current={Math.round(stats.storageStats.totalEncryptedSize / (1024 * 1024))}
          total={10240}
          unit="MB"
        />
      </div>
    </div>
  );
}
