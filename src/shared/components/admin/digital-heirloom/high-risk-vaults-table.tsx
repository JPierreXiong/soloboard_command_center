/**
 * High Risk Vaults Table Component
 * 高风险金库表格组件
 * 
 * 功能：显示高风险金库列表，支持一键补偿操作
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Gift, RotateCcw, Truck, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { CompensationForm } from './compensation-form';

interface VaultListItem {
  id: string;
  userId: string;
  userEmail: string;
  planLevel: 'free' | 'base' | 'pro';
  status: string;
  remainingHours: number | null;
  daysUntilTrigger: number | null;
  beneficiariesCount: number;
  decryptionProgress: {
    used: number;
    limit: number;
  };
  lastSeenAt: string | null;
  warningEmailSentAt: string | null;
  warningEmailCount: number;
}

interface HighRiskVaultsTableProps {
  initialVaults?: VaultListItem[];
  onRefresh?: () => void;
}

export function HighRiskVaultsTable({ initialVaults = [], onRefresh }: HighRiskVaultsTableProps) {
  const [vaults, setVaults] = useState<VaultListItem[]>(initialVaults);
  const [loading, setLoading] = useState(false);
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [hoursLeftFilter, setHoursLeftFilter] = useState<string>('all');
  const [compensationVault, setCompensationVault] = useState<VaultListItem | null>(null);

  // 加载高风险金库
  const fetchUrgentVaults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ urgent: 'true' });
      if (planFilter !== 'all') params.append('plan', planFilter);
      if (hoursLeftFilter !== 'all') params.append('hoursLeft', hoursLeftFilter);

      const res = await fetch(`/api/admin/digital-heirloom/vaults?${params.toString()}`);
      const data = await res.json();
      
      if (data.code === 0) {
        setVaults(data.data.vaults || []);
      }
    } catch (error) {
      console.error('Failed to fetch urgent vaults:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrgentVaults();
    // 每 5 分钟自动刷新
    const interval = setInterval(fetchUrgentVaults, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [planFilter, hoursLeftFilter]);

  // 复制 Vault ID
  const copyVaultId = (vaultId: string) => {
    navigator.clipboard.writeText(vaultId);
    // 可以添加 toast 通知
  };

  // 获取剩余时间显示
  const getRemainingTimeDisplay = (hours: number | null) => {
    if (hours === null) return 'N/A';
    if (hours < 0) return '已过期';
    if (hours < 24) return `${Math.floor(hours)}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  // 获取风险等级颜色
  const getRiskColor = (hours: number | null) => {
    if (hours === null || hours < 0) return 'text-red-600 bg-red-50';
    if (hours < 24) return 'text-red-600 bg-red-50';
    if (hours < 48) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  // 获取计划等级 Badge 颜色
  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'base':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredVaults = vaults.filter((vault) => {
    if (planFilter !== 'all' && vault.planLevel !== planFilter) return false;
    if (hoursLeftFilter !== 'all' && vault.remainingHours !== null) {
      const threshold = hoursLeftFilter === '<24' ? 24 : hoursLeftFilter === '<48' ? 48 : 168;
      if (vault.remainingHours >= threshold) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="flex gap-4 items-center">
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="计划等级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部计划</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="base">Base</SelectItem>
            <SelectItem value="free">Free</SelectItem>
          </SelectContent>
        </Select>

        <Select value={hoursLeftFilter} onValueChange={setHoursLeftFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="剩余时间" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="<24">&lt; 24 小时</SelectItem>
            <SelectItem value="<48">&lt; 48 小时</SelectItem>
            <SelectItem value="<168">&lt; 7 天</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={fetchUrgentVaults} variant="outline" size="sm" disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </Button>

        <div className="text-sm text-gray-500 ml-auto">
          共 {filteredVaults.length} 个高风险金库
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 text-sm uppercase">
            <tr>
              <th className="p-4 font-medium">用户信息</th>
              <th className="p-4 font-medium">计划等级</th>
              <th className="p-4 font-medium">当前状态</th>
              <th className="p-4 font-medium">剩余时间</th>
              <th className="p-4 font-medium">解密进度</th>
              <th className="p-4 font-medium">受益人</th>
              <th className="p-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredVaults.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  {loading ? '加载中...' : '暂无高风险金库'}
                </td>
              </tr>
            ) : (
              filteredVaults.map((vault) => (
                <tr 
                  key={vault.id} 
                  className="hover:bg-blue-50/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{vault.userEmail}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <span>ID: {vault.id.slice(0, 8)}...</span>
                      <button
                        onClick={() => copyVaultId(vault.id)}
                        className="text-blue-500 hover:text-blue-700"
                        title="复制完整 ID"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge 
                      variant="outline" 
                      className={getPlanBadgeColor(vault.planLevel)}
                    >
                      {vault.planLevel.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm">
                    <div className="flex flex-col">
                      <span className="text-red-600 font-semibold uppercase">
                        {vault.status}
                      </span>
                      {vault.warningEmailCount > 0 && (
                        <span className="text-xs text-gray-500 mt-1">
                          已发送 {vault.warningEmailCount} 次警告
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={`text-sm font-semibold px-2 py-1 rounded ${getRiskColor(vault.remainingHours)}`}>
                      {getRemainingTimeDisplay(vault.remainingHours)}
                    </div>
                    {vault.remainingHours !== null && vault.remainingHours < 24 && (
                      <div className="text-xs text-red-500 mt-1">⚠️ 紧急</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-700">
                      {vault.decryptionProgress.used} / {vault.decryptionProgress.limit}
                    </div>
                    <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                      <div 
                        className={`h-full rounded-full ${
                          vault.decryptionProgress.used >= vault.decryptionProgress.limit
                            ? 'bg-red-500'
                            : 'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min(
                            (vault.decryptionProgress.used / vault.decryptionProgress.limit) * 100,
                            100
                          )}%` 
                        }}
                      />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{vault.beneficiariesCount}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        title="延长30天"
                        onClick={() => setCompensationVault({ ...vault, actionType: 'EXTEND_SUBSCRIPTION' } as any)}
                      >
                        <Gift className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="重置解密次数"
                        onClick={() => setCompensationVault({ ...vault, actionType: 'RESET_DECRYPTION_COUNT' } as any)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      {vault.planLevel === 'pro' && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="查看物流"
                        >
                          <Truck className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 补偿表单对话框 */}
      {compensationVault && (
        <CompensationForm
          vault={compensationVault}
          onClose={() => setCompensationVault(null)}
          onSuccess={() => {
            setCompensationVault(null);
            fetchUrgentVaults();
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
