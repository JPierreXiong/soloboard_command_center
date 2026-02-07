/**
 * Compensation Logs Table Component
 * 补偿审计日志表格组件
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Gift, Calendar, User, Search, Filter } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';

interface CompensationLog {
  id: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  actionType: string;
  vaultId: string | null;
  beneficiaryId: string | null;
  actionData: any;
  reason: string;
  beforeState: any;
  afterState: any;
  createdAt: string;
}

interface CompensationLogsTableProps {}

export function CompensationLogsTable({}: CompensationLogsTableProps) {
  const [logs, setLogs] = useState<CompensationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<CompensationLog | null>(null);

  // 筛选条件
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 加载审计日志
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (actionTypeFilter !== 'all') {
        params.append('actionType', actionTypeFilter);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const res = await fetch(`/api/admin/digital-heirloom/compensations?${params.toString()}`);
      const data = await res.json();

      if (data.code === 0) {
        setLogs(data.data.logs || []);
        setTotalPages(data.data.pagination.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch compensation logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionTypeFilter, startDate, endDate]);

  // 获取操作类型显示名称
  const getActionTypeName = (type: string) => {
    const names: Record<string, string> = {
      EXTEND_SUBSCRIPTION: '延长订阅',
      RESET_DECRYPTION_COUNT: '重置解密次数',
      ADD_DECRYPTION_COUNT: '增加解密次数',
      ADD_BONUS_DECRYPTION_COUNT: '增加赠送解密次数',
    };
    return names[type] || type;
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">操作类型</label>
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="EXTEND_SUBSCRIPTION">延长订阅</SelectItem>
                <SelectItem value="RESET_DECRYPTION_COUNT">重置解密次数</SelectItem>
                <SelectItem value="ADD_DECRYPTION_COUNT">增加解密次数</SelectItem>
                <SelectItem value="ADD_BONUS_DECRYPTION_COUNT">增加赠送解密次数</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

          <Button onClick={fetchLogs} variant="outline" disabled={loading}>
            <Filter className="h-4 w-4 mr-2" />
            筛选
          </Button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 text-sm uppercase">
            <tr>
              <th className="p-4 font-medium">操作时间</th>
              <th className="p-4 font-medium">管理员</th>
              <th className="p-4 font-medium">操作类型</th>
              <th className="p-4 font-medium">操作详情</th>
              <th className="p-4 font-medium">原因</th>
              <th className="p-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  暂无补偿记录
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="p-4 text-sm">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-medium">{log.adminName}</div>
                    <div className="text-xs text-gray-400">{log.adminEmail}</div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline">
                      {getActionTypeName(log.actionType)}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm">
                    {log.actionData?.days && (
                      <div>延长 {log.actionData.days} 天</div>
                    )}
                    {log.actionData?.count && (
                      <div>增加 {log.actionData.count} 次</div>
                    )}
                    {log.vaultId && (
                      <div className="text-xs text-gray-400 mt-1">
                        Vault: {log.vaultId.slice(0, 8)}...
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                    {log.reason}
                  </td>
                  <td className="p-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedLog(log)}
                    >
                      查看详情
                    </Button>
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

      {/* 详情对话框 */}
      {selectedLog && (
        <Dialog open={true} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                补偿操作详情
              </DialogTitle>
              <DialogDescription>
                操作时间：{formatDate(selectedLog.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">管理员</div>
                  <div className="text-sm">{selectedLog.adminName} ({selectedLog.adminEmail})</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">操作类型</div>
                  <div className="text-sm">
                    <Badge variant="outline">
                      {getActionTypeName(selectedLog.actionType)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">原因</div>
                  <div className="text-sm">{selectedLog.reason}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">操作详情</div>
                  <div className="text-sm">
                    {JSON.stringify(selectedLog.actionData, null, 2)}
                  </div>
                </div>
              </div>

              {/* 状态对比 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">操作前状态</div>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(selectedLog.beforeState, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">操作后状态</div>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(selectedLog.afterState, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
