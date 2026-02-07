/**
 * Reports Component
 * 自定义报表组件
 */

'use client';

import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Gift, Activity, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Label } from '@/shared/components/ui/label';

interface ReportsProps {}

export function Reports({}: ReportsProps) {
  const [reportType, setReportType] = useState<string>('overview');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 设置默认日期范围（本月）
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, []);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      alert('请选择日期范围');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        startDate,
        endDate,
      });

      const res = await fetch(`/api/admin/digital-heirloom/reports?${params.toString()}`);
      const data = await res.json();

      if (data.code === 0) {
        setReportData(data.data);
      } else {
        alert(`生成报表失败：${data.message}`);
      }
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      alert(`生成报表失败：${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) {
      alert('请先生成报表');
      return;
    }

    // 将报表数据转换为 CSV
    let csvContent = '';
    
    switch (reportType) {
      case 'overview':
        csvContent = 'Plan Level,Status,Count\n';
        Object.entries(reportData.planStats || {}).forEach(([plan, statuses]: [string, any]) => {
          Object.entries(statuses).forEach(([status, count]: [string, any]) => {
            csvContent += `${plan},${status},${count}\n`;
          });
        });
        break;
      case 'conversion':
        csvContent = 'Metric,Value\n';
        csvContent += `Free Users with Decryption,${reportData.conversionStats.freeUsersWithDecryption}\n`;
        csvContent += `Potential Conversion Value,$${reportData.conversionStats.potentialConversionValue}\n`;
        break;
      case 'compensation':
        csvContent = 'Action Type,Count,Total Days\n';
        (reportData.compensationStats || []).forEach((stat: any) => {
          csvContent += `${stat.actionType},${stat.count},${stat.totalDays}\n`;
        });
        break;
      case 'activity':
        csvContent = 'Date,Active Vaults\n';
        (reportData.dailyActivity || []).forEach((day: any) => {
          csvContent += `${day.date},${day.activeVaults}\n`;
        });
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* 报表配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            自定义报表
          </CardTitle>
          <CardDescription>生成各种业务报表</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>报表类型</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        概览报表
                      </div>
                    </SelectItem>
                    <SelectItem value="conversion">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        转化报表
                      </div>
                    </SelectItem>
                    <SelectItem value="compensation">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        补偿报表
                      </div>
                    </SelectItem>
                    <SelectItem value="activity">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        活动报表
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>开始日期</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label>结束日期</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={generateReport} disabled={loading}>
                {loading ? '生成中...' : '生成报表'}
              </Button>
              {reportData && (
                <Button onClick={exportReport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  导出 CSV
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 报表结果 */}
      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>报表结果</CardTitle>
            <CardDescription>
              {new Date(reportData.period.start).toLocaleDateString('zh-CN')} -{' '}
              {new Date(reportData.period.end).toLocaleDateString('zh-CN')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportType === 'overview' && (
              <div className="space-y-4">
                <div className="text-sm font-medium">计划等级分布</div>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(reportData.planStats || {}).map(([plan, statuses]: [string, any]) => (
                    <div key={plan} className="p-4 bg-gray-50 rounded">
                      <div className="font-semibold mb-2">{plan.toUpperCase()}</div>
                      {Object.entries(statuses).map(([status, count]: [string, any]) => (
                        <div key={status} className="text-sm text-gray-600">
                          {status}: {count}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reportType === 'conversion' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded">
                    <div className="text-sm text-gray-600">已使用解密的 Free 用户</div>
                    <div className="text-2xl font-bold">
                      {reportData.conversionStats.freeUsersWithDecryption}
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded">
                    <div className="text-sm text-gray-600">潜在转化价值</div>
                    <div className="text-2xl font-bold">
                      ${reportData.conversionStats.potentialConversionValue}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reportType === 'compensation' && (
              <div className="space-y-4">
                <div className="text-sm font-medium">补偿操作统计</div>
                <table className="w-full text-left">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2">操作类型</th>
                      <th className="p-2">次数</th>
                      <th className="p-2">总天数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.compensationStats || []).map((stat: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{stat.actionType}</td>
                        <td className="p-2">{stat.count}</td>
                        <td className="p-2">{stat.totalDays}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === 'activity' && (
              <div className="space-y-4">
                <div className="text-sm font-medium">每日活跃度</div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2">日期</th>
                        <th className="p-2">活跃金库数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.dailyActivity || []).map((day: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{day.date}</td>
                          <td className="p-2">{day.activeVaults}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
