/**
 * Cost Monitoring Component
 * 成本监控组件
 */

'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Mail, HardDrive, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { CostAlertGauge } from './cost-alert-gauge';

interface CostMonitoringProps {}

export function CostMonitoring({}: CostMonitoringProps) {
  const [costData, setCostData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('month');

  useEffect(() => {
    fetchCostData();
  }, [period]);

  const fetchCostData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/digital-heirloom/costs?period=${period}`);
      const data = await res.json();
      
      if (data.code === 0) {
        setCostData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch cost data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !costData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 周期选择 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">成本监控</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">今日</SelectItem>
            <SelectItem value="week">本周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 报警横幅 */}
      {costData.alerts && costData.alerts.length > 0 && (
        <div className="space-y-2">
          {costData.alerts.map((alert: any, index: number) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                alert.level === 'critical'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-orange-50 border-orange-200 text-orange-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 邮件成本 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            邮件成本
          </CardTitle>
          <CardDescription>Resend 邮件发送统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">已发送</div>
                <div className="text-2xl font-bold">{costData.email.total.sent}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">失败</div>
                <div className="text-2xl font-bold text-red-600">{costData.email.total.failed}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">已打开</div>
                <div className="text-2xl font-bold text-green-600">{costData.email.total.opened}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">已点击</div>
                <div className="text-2xl font-bold text-blue-600">{costData.email.total.clicked}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500">Free 用户</div>
                <div className="text-lg font-semibold">{costData.email.byPlan.free}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Base 用户</div>
                <div className="text-lg font-semibold">{costData.email.byPlan.base}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Pro 用户</div>
                <div className="text-lg font-semibold">{costData.email.byPlan.pro}</div>
              </div>
            </div>

            <CostAlertGauge
              label="邮件发送量"
              current={costData.email.total.sent}
              total={costData.email.thresholds.daily}
              unit="封"
            />
          </div>
        </CardContent>
      </Card>

      {/* 存储成本 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            存储成本
          </CardTitle>
          <CardDescription>存储使用量统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">总存储</div>
                <div className="text-2xl font-bold">
                  {costData.storage.total.sizeMB.toFixed(2)} MB
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {costData.storage.total.vaultCount} 个金库
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">使用率</div>
                <div className="text-2xl font-bold">
                  {costData.storage.percentage.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500">Free</div>
                <div className="text-lg font-semibold">
                  {costData.storage.byPlan.free.sizeMB.toFixed(2)} MB
                </div>
                <div className="text-xs text-gray-400">
                  {costData.storage.byPlan.free.count} 个
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Base</div>
                <div className="text-lg font-semibold">
                  {costData.storage.byPlan.base.sizeMB.toFixed(2)} MB
                </div>
                <div className="text-xs text-gray-400">
                  {costData.storage.byPlan.base.count} 个
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Pro</div>
                <div className="text-lg font-semibold">
                  {costData.storage.byPlan.pro.sizeMB.toFixed(2)} MB
                </div>
                <div className="text-xs text-gray-400">
                  {costData.storage.byPlan.pro.count} 个
                </div>
              </div>
            </div>

            <CostAlertGauge
              label="存储使用量"
              current={costData.storage.percentage}
              total={100}
              unit="%"
            />
          </div>
        </CardContent>
      </Card>

      {/* 物流成本 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            物流成本
          </CardTitle>
          <CardDescription>ShipAny 物流订单统计（Pro 用户）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">总订单数</div>
                <div className="text-2xl font-bold">{costData.shipping.total.orders}</div>
                <div className="text-xs text-gray-400 mt-1">
                  总金额: ¥{costData.shipping.total.amount.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">本期订单</div>
                <div className="text-2xl font-bold">{costData.shipping.period.orders}</div>
                <div className="text-xs text-gray-400 mt-1">
                  金额: ¥{costData.shipping.period.amount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
