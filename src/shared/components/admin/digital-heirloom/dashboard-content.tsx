/**
 * Dashboard Content Component
 * 看板内容组件（客户端组件，用于数据获取）
 */

'use client';

import React, { useState, useEffect } from 'react';
import { StatsCards } from './stats-cards';
import { HighRiskVaultsTable } from './high-risk-vaults-table';
import { AlertBanner } from './alert-banner';

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

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/digital-heirloom/stats');
        const data = await res.json();
        
        if (data.code === 0) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // 每 5 分钟自动刷新
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {stats && <StatsCards stats={stats} />}

      {/* 高风险金库列表 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            高风险金库监控
          </h2>
          <span className="text-sm text-gray-500">自动刷新：每 5 分钟</span>
        </div>
        <HighRiskVaultsTable onRefresh={() => {
          // 刷新统计数据
          fetch('/api/admin/digital-heirloom/stats')
            .then(res => res.json())
            .then(data => {
              if (data.code === 0) {
                setStats(data.data);
              }
            });
        }} />
      </div>
    </div>
  );
}
