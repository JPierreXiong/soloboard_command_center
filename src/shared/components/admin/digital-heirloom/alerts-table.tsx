/**
 * Alerts Table Component
 * 报警历史记录表格组件
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Filter, Check } from 'lucide-react';
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
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  type: string;
  category: string;
  message: string;
  alertData: any;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolvedByName: string | null;
  resolvedByEmail: string | null;
  resolvedNote: string | null;
  createdAt: string;
}

interface AlertsTableProps {}

export function AlertsTable({}: AlertsTableProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolveNote, setResolveNote] = useState<string>('');

  // 筛选条件
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<string>('false');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 加载报警记录
  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (levelFilter !== 'all') {
        params.append('level', levelFilter);
      }
      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }
      if (resolvedFilter !== 'all') {
        params.append('resolved', resolvedFilter);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const res = await fetch(`/api/admin/digital-heirloom/alerts?${params.toString()}`);
      const data = await res.json();

      if (data.code === 0) {
        setAlerts(data.data.alerts || []);
        setTotalPages(data.data.pagination.totalPages || 1);
        setStatistics(data.data.statistics);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [page, levelFilter, typeFilter, resolvedFilter, startDate, endDate]);

  const handleResolve = async (alertId: string, resolved: boolean) => {
    try {
      const res = await fetch('/api/admin/digital-heirloom/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          resolved,
          note: resolveNote.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.code === 0) {
        setSelectedAlert(null);
        setResolveNote('');
        fetchAlerts();
      } else {
        alert(`操作失败：${data.message}`);
      }
    } catch (error: any) {
      console.error('Failed to resolve alert:', error);
      alert(`操作失败：${error.message}`);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'warning':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">总报警数</div>
            <div className="text-2xl font-bold">{statistics.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-red-200">
            <div className="text-sm text-gray-500">未解决</div>
            <div className="text-2xl font-bold text-red-600">{statistics.unresolved}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">严重报警</div>
            <div className="text-2xl font-bold text-red-600">
              {statistics.unresolvedByLevel.critical}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">警告</div>
            <div className="text-2xl font-bold text-orange-600">
              {statistics.unresolvedByLevel.warning}
            </div>
          </div>
        </div>
      )}

      {/* 筛选栏 */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">级别</label>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="critical">严重</SelectItem>
                <SelectItem value="warning">警告</SelectItem>
                <SelectItem value="info">信息</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">类型</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="business">业务</SelectItem>
                <SelectItem value="resource">资源</SelectItem>
                <SelectItem value="cost">成本</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">状态</label>
            <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="false">未解决</SelectItem>
                <SelectItem value="true">已解决</SelectItem>
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

          <Button onClick={fetchAlerts} variant="outline" disabled={loading}>
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
              <th className="p-4 font-medium">时间</th>
              <th className="p-4 font-medium">级别</th>
              <th className="p-4 font-medium">类型</th>
              <th className="p-4 font-medium">类别</th>
              <th className="p-4 font-medium">消息</th>
              <th className="p-4 font-medium">状态</th>
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
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  暂无报警记录
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="p-4 text-sm">
                    {formatDate(alert.createdAt)}
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className={getLevelColor(alert.level)}>
                      {alert.level.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm">{alert.type}</td>
                  <td className="p-4 text-sm">{alert.category}</td>
                  <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                    {alert.message}
                  </td>
                  <td className="p-4">
                    {alert.resolved ? (
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        已解决
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-100 text-red-700">
                        <XCircle className="h-3 w-3 mr-1" />
                        未解决
                      </Badge>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAlert(alert)}
                      >
                        查看详情
                      </Button>
                      {!alert.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAlert(alert);
                            setResolveNote('');
                          }}
                        >
                          <Check className="h-4 w-4" />
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

      {/* 详情/解决对话框 */}
      {selectedAlert && (
        <Dialog open={true} onOpenChange={() => {
          setSelectedAlert(null);
          setResolveNote('');
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                报警详情
              </DialogTitle>
              <DialogDescription>
                时间：{formatDate(selectedAlert.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">级别</div>
                  <Badge variant="outline" className={getLevelColor(selectedAlert.level)}>
                    {selectedAlert.level.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">类型</div>
                  <div className="text-sm">{selectedAlert.type}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">类别</div>
                  <div className="text-sm">{selectedAlert.category}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">状态</div>
                  {selectedAlert.resolved ? (
                    <Badge variant="outline" className="bg-green-100 text-green-700">
                      已解决
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-100 text-red-700">
                      未解决
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">消息</div>
                <div className="text-sm">{selectedAlert.message}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">报警数据</div>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(selectedAlert.alertData, null, 2)}
                </pre>
              </div>

              {selectedAlert.resolved && (
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-sm font-medium text-gray-700 mb-1">解决信息</div>
                  <div className="text-sm text-gray-600">
                    解决人：{selectedAlert.resolvedByName || selectedAlert.resolvedByEmail || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-600">
                    解决时间：{selectedAlert.resolvedAt ? formatDate(selectedAlert.resolvedAt) : 'N/A'}
                  </div>
                  {selectedAlert.resolvedNote && (
                    <div className="text-sm text-gray-600 mt-1">
                      备注：{selectedAlert.resolvedNote}
                    </div>
                  )}
                </div>
              )}

              {!selectedAlert.resolved && (
                <div>
                  <Label>解决备注（可选）</Label>
                  <Textarea
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    placeholder="请输入解决备注..."
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedAlert(null);
                    setResolveNote('');
                  }}
                >
                  关闭
                </Button>
                {!selectedAlert.resolved && (
                  <Button
                    onClick={() => handleResolve(selectedAlert.id, true)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    标记为已解决
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
