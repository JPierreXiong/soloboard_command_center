/**
 * Security Monitoring Component
 * 安全监控组件
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Eye, Lock, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

interface SecurityMonitoringProps {}

export function SecurityMonitoring({}: SecurityMonitoringProps) {
  const [securityData, setSecurityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(7);

  useEffect(() => {
    fetchSecurityData();
  }, [days]);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/digital-heirloom/security?days=${days}`);
      const data = await res.json();
      
      if (data.code === 0) {
        setSecurityData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !securityData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const getSuspiciousIPLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 时间范围选择 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">安全监控</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">查询最近</span>
          <Input
            type="number"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value) || 7)}
            className="w-20"
            min="1"
            max="30"
          />
          <span className="text-sm text-gray-500">天</span>
        </div>
      </div>

      {/* 异常解密尝试 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            异常解密尝试
          </CardTitle>
          <CardDescription>失败的解密尝试记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm text-gray-500">总失败次数</div>
                <div className="text-2xl font-bold text-red-600">
                  {securityData.failedDecryptionAttempts.total}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">可疑 IP 数量</div>
                <div className="text-2xl font-bold text-orange-600">
                  {securityData.suspiciousIPs.length}
                </div>
              </div>
            </div>

            {securityData.suspiciousIPs.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">可疑 IP 地址</div>
                <div className="space-y-2">
                  {securityData.suspiciousIPs.slice(0, 10).map((ip: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getSuspiciousIPLevelColor(ip.level)}
                        >
                          {ip.level.toUpperCase()}
                        </Badge>
                        <span className="font-mono text-sm">{ip.ip}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {ip.failureCount} 次失败
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {securityData.failedDecryptionAttempts.recent.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">最近失败记录</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {securityData.failedDecryptionAttempts.recent.slice(0, 20).map((attempt: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                    >
                      <div>
                        <div className="font-medium">{attempt.email}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(attempt.timestamp).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div className="text-right">
                        {attempt.ip && (
                          <div className="font-mono text-xs text-gray-500">{attempt.ip}</div>
                        )}
                        {attempt.reason && (
                          <div className="text-xs text-red-500">{attempt.reason}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 异常访问模式 */}
      {securityData.abnormalPatterns.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              异常访问模式
            </CardTitle>
            <CardDescription>检测到短时间内多次访问</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {securityData.abnormalPatterns.map((pattern: any, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-white rounded border border-orange-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{pattern.email}</div>
                      <div className="text-xs text-gray-500">
                        Vault: {pattern.vaultId.slice(0, 8)}...
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-600">
                        {pattern.accessCount} 次
                      </div>
                      <div className="text-xs text-gray-500">
                        {pattern.timeWindow}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 最近访问记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            最近访问记录
          </CardTitle>
          <CardDescription>受益人访问记录（最近 {days} 天）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {securityData.recentAccesses.length === 0 ? (
              <div className="text-center text-gray-500 py-8">暂无访问记录</div>
            ) : (
              securityData.recentAccesses.map((access: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
                  <div>
                    <div className="font-medium">{access.email}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(access.lastAccessAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {access.hasActiveToken && (
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        有效 Token
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400">
                      {access.vaultId.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 过期但未触发的金库 */}
      {securityData.expiredVaults.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Clock className="h-5 w-5" />
              过期但未触发的金库
            </CardTitle>
            <CardDescription>需要关注的金库</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {securityData.expiredVaults.map((vault: any, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-white rounded border border-red-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Vault: {vault.id.slice(0, 8)}...</div>
                      <div className="text-xs text-gray-500">
                        状态: {vault.status}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-600">
                        已过期 {vault.daysSinceExpired} 天
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(vault.expiredAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
