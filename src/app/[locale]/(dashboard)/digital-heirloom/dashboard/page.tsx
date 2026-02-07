/**
 * Digital Heirloom Dashboard 页面
 * 参考 UI 截图设计
 */

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/core/i18n/navigation';
import { Heart, Shield, Clock, Users, Lock, AlertCircle, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  vaultItemsCount: number;
  beneficiariesCount: number;
  securityStatus: 'protected' | 'warning';
  checkInStreak: number;
  lastCheckIn: string | null;
  nextCheckInDue: number | null; // 天数
  userPlan?: 'free' | 'base' | 'pro' | 'on_demand';
}

export default function DigitalHeirloomDashboardPage() {
  const t = useTranslations('digital-heirloom.dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // 0. 获取用户信息（包含套餐信息）
      let userPlan: 'free' | 'base' | 'pro' | 'on_demand' = 'free';
      try {
        const userResponse = await fetch('/api/user/get-user-info', {
          method: 'POST',
        });
        const userResult = await userResponse.json();
        if (userResult.code === 0 && userResult.data?.planType) {
          userPlan = userResult.data.planType;
        }
      } catch (userError) {
        console.warn('获取用户套餐信息失败:', userError);
      }

      // 1. 获取保险箱信息
      const vaultResponse = await fetch('/api/digital-heirloom/vault/get');
      const vaultResult = await vaultResponse.json();

      // API 响应格式：code: 0 表示成功，code: -1 表示错误
      if (vaultResult.code !== 0 || !vaultResult.data?.vault) {
        // 如果没有保险箱，仍然尝试获取资产和受益人数据
        const beneficiaries: any[] = vaultResult.data?.beneficiaries || [];
        
        // 2. 获取资产列表（即使没有保险箱也尝试）
        const assetsResponse = await fetch('/api/digital-heirloom/assets/list');
        const assetsResult = await assetsResponse.json();
        const assets = assetsResult.code === 0 ? (assetsResult.data?.assets || []) : [];
        
        setStats({
          vaultItemsCount: assets.length,
          beneficiariesCount: beneficiaries.length,
          securityStatus: 'protected',
          checkInStreak: 0,
          lastCheckIn: null,
          nextCheckInDue: null,
          userPlan,
        });
        setLoading(false);
        return;
      }

      const vault = vaultResult.data.vault;
      const beneficiaries = vaultResult.data.beneficiaries || [];
      const latestHeartbeat = vaultResult.data.latestHeartbeat;

      // 2. 获取资产列表（API + IndexedDB 双轨制）
      const assetsResponse = await fetch('/api/digital-heirloom/assets/list');
      const assetsResult = await assetsResponse.json();
      // API 响应格式：code: 0 表示成功
      let assets = assetsResult.code === 0 ? (assetsResult.data?.assets || []) : [];
      
      // 3. 从 IndexedDB 获取本地资产（补充云端数据）
      try {
        const { getPendingAssets } = await import('@/shared/lib/indexeddb-cache');
        if (vault?.id) {
          const localAssets = await getPendingAssets(vault.id);
          // 合并本地资产（避免重复）
          const localAssetIds = new Set(assets.map((a: any) => a.id));
          const newLocalAssets = localAssets.filter((la: any) => !localAssetIds.has(la.id));
          assets = [...assets, ...newLocalAssets];
        }
      } catch (indexedDBError) {
        console.warn('Failed to load assets from IndexedDB:', indexedDBError);
        // 忽略 IndexedDB 错误，继续使用 API 数据
      }

      // 4. 计算打卡信息
      let checkInStreak = 0;
      let lastCheckIn: string | null = null;
      let nextCheckInDue: number | null = null;

      if (latestHeartbeat?.createdAt) {
        lastCheckIn = new Date(latestHeartbeat.createdAt).toLocaleDateString();
        // TODO: 计算连续打卡周数
        checkInStreak = 0; // 需要从历史记录计算
      }

      if (vault.lastSeenAt && vault.heartbeatFrequency) {
        const lastSeen = new Date(vault.lastSeenAt);
        const nextDue = new Date(lastSeen.getTime() + vault.heartbeatFrequency * 24 * 60 * 60 * 1000);
        const now = new Date();
        const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        nextCheckInDue = daysUntilDue > 0 ? daysUntilDue : 0;
      }

      setStats({
        vaultItemsCount: assets.length,
        beneficiariesCount: beneficiaries.length,
        securityStatus: 'protected',
        checkInStreak,
        lastCheckIn,
        nextCheckInDue,
        userPlan,
      });
    } catch (error) {
      console.error('加载 Dashboard 数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      const response = await fetch('/api/digital-heirloom/vault/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      // API 响应格式：code: 0 表示成功
      if (result.code !== 0) {
        throw new Error(result.message || '打卡失败');
      }

      toast.success('打卡成功！');
      await loadDashboardData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '打卡失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Your digital legacy is secure. Here's an overview of your account.
          </p>
        </div>

        {/* Dead Man's Switch 警告框 */}
        {stats && stats.nextCheckInDue !== null && (
          <div className="mb-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Heart className="w-8 h-8 text-green-600 dark:text-green-400" />
                  <div className="absolute inset-0 animate-ping">
                    <Heart className="w-8 h-8 text-green-400 opacity-20" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Dead Man's Switch
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Next check-in due in {stats.nextCheckInDue} days
                  </p>
                </div>
              </div>
              <button
                onClick={handleCheckIn}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                I'm Still Here
              </button>
            </div>
          </div>
        )}

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Vault Items */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Lock className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
            <div className="relative">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Vault Items
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.vaultItemsCount || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Encrypted secrets stored
              </p>
            </div>
          </div>

          {/* Beneficiaries */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Users className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
            <div className="relative">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Beneficiaries
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.beneficiariesCount || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Trusted contacts
              </p>
            </div>
          </div>

          {/* Security Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Shield className="w-8 h-8 text-green-500 opacity-20" />
            </div>
            <div className="relative">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Security Status
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                Protected
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Zero-knowledge encryption
              </p>
            </div>
          </div>

          {/* Check-in Streak */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Clock className="w-8 h-8 text-green-500 opacity-20" />
            </div>
            <div className="relative">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Check-in Streak
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.checkInStreak || 0} weeks
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Last: {stats?.lastCheckIn || 'Never'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {/* TODO: 实现活动列表 */}
              <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Updated vault item</span>
                <span className="text-gray-400">2 days ago</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Added beneficiary</span>
                <span className="text-gray-400">1 week ago</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <a
                href="/digital-heirloom/vault"
                className="block px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Add Vault Item
                  </span>
                  <Lock className="w-4 h-4 text-blue-600" />
                </div>
              </a>
              <a
                href="/digital-heirloom/beneficiaries"
                className="block px-4 py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Add Beneficiary
                  </span>
                  <Users className="w-4 h-4 text-green-600" />
                </div>
              </a>
              <a
                href="/digital-heirloom/settings"
                className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Configure Dead Man's Switch
                  </span>
                  <AlertCircle className="w-4 h-4 text-gray-600" />
                </div>
              </a>
              <Link
                href="/pricing"
                className="block px-4 py-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats?.userPlan === 'free' ? 'Upgrade Plan' : stats?.userPlan === 'base' ? 'Upgrade to Pro' : 'Manage Plan'}
                  </span>
                  <ArrowUpCircle className="w-4 h-4 text-purple-600" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

