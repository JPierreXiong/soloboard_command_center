/**
 * Alert Banner Component
 * 报警横幅组件
 * 
 * 功能：在管理员界面顶部显示未解决的严重报警
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  type: string;
  category: string;
  message: string;
  createdAt: string;
}

interface AlertBannerProps {
  maxAlerts?: number; // 最多显示的报警数量
}

export function AlertBanner({ maxAlerts = 3 }: AlertBannerProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAlerts();
    // 每 5 分钟自动刷新
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/admin/digital-heirloom/alerts?resolved=false&level=critical&limit=10');
      const data = await res.json();
      
      if (data.code === 0) {
        setAlerts(data.data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(new Set([...dismissedAlerts, alertId]));
  };

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));
  const criticalAlerts = visibleAlerts.filter(a => a.level === 'critical');
  const warningAlerts = visibleAlerts.filter(a => a.level === 'warning');
  const displayAlerts = expanded ? visibleAlerts : visibleAlerts.slice(0, maxAlerts);

  if (loading || visibleAlerts.length === 0) {
    return null;
  }

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className={`border-b ${criticalAlerts.length > 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`h-5 w-5 ${criticalAlerts.length > 0 ? 'text-red-600' : 'text-orange-600'}`} />
              <span className="font-semibold">
                {criticalAlerts.length > 0 
                  ? `${criticalAlerts.length} 个严重报警需要关注`
                  : `${warningAlerts.length} 个警告需要关注`
                }
              </span>
            </div>

            <div className="space-y-2">
              {displayAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded border ${getAlertColor(alert.level)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={
                            alert.level === 'critical'
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : 'bg-orange-100 text-orange-700 border-orange-300'
                          }
                        >
                          {alert.level.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">{alert.category}</span>
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(alert.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissAlert(alert.id)}
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {visibleAlerts.length > maxAlerts && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="mt-2"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    显示全部 ({visibleAlerts.length} 个)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
