/**
 * Vaults Management Component
 * 金库管理组件
 * 
 * 功能：显示所有金库列表，支持搜索、筛选、批量操作、导出
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Gift, Eye, Copy } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { BatchCompensationForm } from './batch-compensation-form';
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
  createdAt: string;
}

interface VaultsManagementProps {}

export function VaultsManagement({}: VaultsManagementProps) {
  const [vaults, setVaults] = useState<VaultListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [compensationVault, setCompensationVault] = useState<VaultListItem | null>(null);

  // 筛选条件
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 加载金库列表
  const fetchVaults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (planFilter !== 'all') {
        params.append('plan', planFilter);
      }
      if (search) {
        params.append('search', search);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const res = await fetch(`/api/admin/digital-heirloom/vaults?${params.toString()}`);
      const data = await res.json();

      if (data.code === 0) {
        setVaults(data.data.vaults || []);
        setTotalPages(data.data.pagination.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch vaults:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaults();
  }, [page, statusFilter, planFilter, startDate, endDate]);

  // 导出 CSV
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (planFilter !== 'all') {
        params.append('plan', planFilter);
      }
      if (search) {
        params.append('search', search);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const res = await fetch(`/api/admin/digital-heirloom/vaults/export?${params.toString()}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `digital-heirloom-vaults-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Export failed:', error);
      alert(`导出失败：${error.message}`);
    }
  };

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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending_verification':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'triggered':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const copyVaultId = (vaultId: string) => {
    navigator.clipboard.writeText(vaultId);
  };

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex gap-4 items-center justify-between">
        <div className="flex-1 flex gap-4 items-center">
          {/* 搜索 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索邮箱或 Vault ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1);
                  fetchVaults();
                }
              }}
              className="pl-10"
            />
          </div>

          {/* 状态筛选 */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending_verification">Pending Verification</SelectItem>
              <SelectItem value="triggered">Triggered</SelectItem>
              <SelectItem value="released">Released</SelectItem>
            </SelectContent>
          </Select>

          {/* 计划筛选 */}
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="计划" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部计划</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="base">Base</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={fetchVaults} variant="outline" disabled={loading}>
            <Filter className="h-4 w-4 mr-2" />
            筛选
          </Button>
        </div>

        <div className="flex gap-2">
          <BatchCompensationForm onSuccess={fetchVaults} />
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出 CSV
          </Button>
        </div>
      </div>

      {/* 日期范围筛选 */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 mb-1 block">开始日期</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 mb-1 block">结束日期</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 text-sm uppercase">
            <tr>
              <th className="p-4 font-medium">用户信息</th>
              <th className="p-4 font-medium">计划等级</th>
              <th className="p-4 font-medium">状态</th>
              <th className="p-4 font-medium">受益人</th>
              <th className="p-4 font-medium">解密进度</th>
              <th className="p-4 font-medium">最后活跃</th>
              <th className="p-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : vaults.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  暂无金库数据
                </td>
              </tr>
            ) : (
              vaults.map((vault) => (
                <tr key={vault.id} className="hover:bg-blue-50/50 transition-colors">
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
                    <Badge variant="outline" className={getPlanBadgeColor(vault.planLevel)}>
                      {vault.planLevel.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className={getStatusBadgeColor(vault.status)}>
                      {vault.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{vault.beneficiariesCount}</div>
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
                          )}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    {vault.lastSeenAt
                      ? new Date(vault.lastSeenAt).toLocaleDateString('zh-CN')
                      : 'N/A'}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        title="补偿"
                        onClick={() => setCompensationVault({ ...vault, actionType: 'EXTEND_SUBSCRIPTION' } as any)}
                      >
                        <Gift className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <div className="flex items-center px-4">
            第 {page} / {totalPages} 页
          </div>
          <Button
            variant="outline"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 补偿表单对话框 */}
      {compensationVault && (
        <CompensationForm
          vault={compensationVault}
          onClose={() => setCompensationVault(null)}
          onSuccess={() => {
            setCompensationVault(null);
            fetchVaults();
          }}
        />
      )}
    </div>
  );
}
