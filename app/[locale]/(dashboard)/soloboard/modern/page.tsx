/**
 * SoloBoard - 现代化仪表板页面
 * 
 * 设计理念：
 * - Command Center：指挥中心式布局
 * - 深邃蓝/石墨灰主色调
 * - 响应式网格布局
 * - 全局搜索 (Cmd+K)
 * - 老板键（隐私模式）
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Search,
  Eye,
  EyeOff,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Users,
  Globe,
  Activity,
} from 'lucide-react';
import { StatCard } from '@/components/soloboard/stat-card';
import { SiteCard } from '@/components/soloboard/modern-site-card';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ModernDashboardPage() {
  const [privacyMode, setPrivacyMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 获取站点数据
  const { data: sitesData, mutate } = useSWR('/api/soloboard/sites', fetcher, {
    refreshInterval: autoRefresh ? 30000 : 0, // 30 秒自动刷新
  });

  const sites = sitesData?.sites || [];

  // 计算全局统计
  const globalStats = {
    totalVisitors: sites.reduce((sum: number, site: any) => {
      return sum + (site.lastSnapshot?.metrics?.activeUsers || 0);
    }, 0),
    totalRevenue: sites.reduce((sum: number, site: any) => {
      return sum + (site.lastSnapshot?.metrics?.revenue || 0);
    }, 0),
    totalTransactions: sites.reduce((sum: number, site: any) => {
      return sum + (site.lastSnapshot?.metrics?.transactions || 0);
    }, 0),
    activeSites: sites.filter((site: any) => site.healthStatus === 'online').length,
    totalSites: sites.length,
  };

  // 过滤站点
  const filteredSites = sites.filter((site: any) =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 全局刷新
  const handleRefreshAll = () => {
    mutate();
  };

  // Cmd+K 全局搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 左侧：标题 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">SoloBoard</h1>
                  <p className="text-xs text-muted-foreground">
                    Multi-site monitoring dashboard
                  </p>
                </div>
              </div>

              {/* 实时状态指示 */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-xs font-medium text-green-600 dark:text-green-500">
                  Live
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date().toLocaleTimeString('zh-CN')}
                </span>
              </div>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-3">
              {/* 全局搜索 */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="global-search"
                  placeholder="搜索站点... (⌘K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              {/* 老板键（隐私模式） */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50">
                {privacyMode ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">隐私</span>
                <Switch
                  checked={privacyMode}
                  onCheckedChange={setPrivacyMode}
                  className="scale-75"
                />
              </div>

              {/* 自动刷新 */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">自动刷新</span>
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                  className="scale-75"
                />
              </div>

              {/* 手动刷新 */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAll}
                className="h-9"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>

              {/* 添加站点 */}
              <Button size="sm" className="h-9">
                <Plus className="w-4 h-4 mr-2" />
                添加站点
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* 全局统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="总访客数 (24h)"
            value={privacyMode ? '***' : globalStats.totalVisitors.toLocaleString()}
            icon={Users}
            color="blue"
            trend={{ value: 12.5, label: 'vs 昨日' }}
          />
          <StatCard
            title="平均在线用户"
            value={privacyMode ? '**' : Math.round(globalStats.totalVisitors / 24)}
            icon={Activity}
            color="purple"
          />
          <StatCard
            title="交易数 (24h)"
            value={privacyMode ? '***' : globalStats.totalTransactions}
            icon={TrendingUp}
            color="yellow"
            trend={{ value: 8.3, label: 'vs 昨日' }}
          />
          <StatCard
            title="总收入 (24h)"
            value={
              privacyMode
                ? '$***'
                : `$${(globalStats.totalRevenue / 100).toLocaleString()}`
            }
            icon={DollarSign}
            color="green"
            trend={{ value: 15.2, label: 'vs 昨日' }}
          />
        </div>

        {/* 站点列表 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">您的站点</h2>
              <Badge variant="secondary" className="text-xs">
                {globalStats.activeSites} / {globalStats.totalSites} 在线
              </Badge>
            </div>

            {autoRefresh && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                自动刷新每 30 秒
              </p>
            )}
          </div>

          {/* 九宫格布局 */}
          {filteredSites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredSites.map((site: any) => (
                <SiteCard
                  key={site.id}
                  id={site.id}
                  name={site.name}
                  url={site.url}
                  platform={site.platform}
                  status={site.healthStatus || 'unknown'}
                  metrics={{
                    primaryValue: privacyMode
                      ? 0
                      : site.lastSnapshot?.metrics?.activeUsers || 0,
                    primaryLabel: '实时在线',
                    secondaryValue: privacyMode
                      ? 0
                      : (site.lastSnapshot?.metrics?.revenue || 0) / 100,
                    secondaryLabel: '今日收入',
                    secondaryUnit: '$',
                    trend: 12.5,
                    sparkline: [20, 40, 30, 80, 50, 90, 40, 60, 70, 55, 85, 75],
                  }}
                  lastSync={site.lastSyncAt ? new Date(site.lastSyncAt) : undefined}
                  onRefresh={() => mutate()}
                  onDelete={() => {
                    // TODO: 实现删除功能
                  }}
                  onViewDetails={() => {
                    // TODO: 跳转到详情页
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Globe className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">还没有监控站点</h3>
              <p className="text-sm text-muted-foreground mb-6">
                点击"添加站点"开始监控您的第一个网站
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                添加站点
              </Button>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        {autoRefresh && (
          <div className="text-center text-xs text-muted-foreground">
            数据每 30 秒自动刷新 · 最后更新:{' '}
            {new Date().toLocaleTimeString('zh-CN')}
          </div>
        )}
      </main>
    </div>
  );
}



