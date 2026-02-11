# 💳 Creem 支付集成完整指南

**功能:** 实时监控 Creem 订阅和收入数据  
**更新频率:** 每 15 分钟（通过 Upstash QStash）  
**支持指标:** 收入、订阅数、MRR、流失率

---

## 🎯 功能概览

### Dashboard 展示效果

```
┌─────────────────┬─────────────────┬─────────────────┐
│  💰 今日收入     │  📊 本月收入     │  🔄 MRR        │
│  $1,234.56      │  $45,678.90     │  $12,345.00    │
│  ↑ 12 笔订单    │  ↑ 456 笔订单   │  月度经常性收入 │
└─────────────────┴─────────────────┴─────────────────┘

┌─────────────────┬─────────────────┬─────────────────┐
│  👥 活跃订阅     │  ✨ 新增订阅     │  ❌ 取消订阅    │
│  1,234 个       │  +56 个         │  -12 个        │
│  同比增长 15%   │  本月新增       │  流失率 0.97%  │
└─────────────────┴─────────────────┴─────────────────┘
```

---

## 📋 第一步：获取 Creem API Key

### 1.1 登录 Creem Dashboard

访问 https://creem.io/dashboard

### 1.2 创建 API Key

1. 点击 **"Settings"** → **"API Keys"**
2. 点击 **"Create API Key"**
3. 设置权限：
   - ✅ **Read Payments**
   - ✅ **Read Subscriptions**
   - ✅ **Read Customers**
   - ❌ Write 权限（不需要）
4. 命名：`SoloBoard Read-Only`
5. 点击 **"Create"**
6. 复制 API Key（以 `creem_` 开头）

**API Key 格式:**
```
creem_live_abc123xyz...  (生产环境)
creem_test_abc123xyz...  (测试环境)
```

⚠️ **安全提示:** 
- 永远不要将 API Key 提交到 Git
- 只在环境变量中存储
- 使用只读权限的 Key

---

## 🔧 第二步：配置环境变量

### 2.1 本地开发环境

**文件:** `.env.local`

```bash
# Creem API Key
CREEM_API_KEY=creem_test_abc123xyz...

# 或生产环境
CREEM_API_KEY=creem_live_abc123xyz...
```

---

### 2.2 Vercel 生产环境

1. 访问 https://vercel.com/dashboard
2. 进入项目设置 → **Environment Variables**
3. 添加新变量：
   - **Name:** `CREEM_API_KEY`
   - **Value:** `creem_live_abc123xyz...`
   - **Environment:** Production, Preview, Development
4. 点击 **"Save"**

---

## 📊 第三步：数据结构说明

### 3.1 Creem Metrics 数据结构

```typescript
interface CreemMetrics {
  todayRevenue: number;           // 今日收入
  monthRevenue: number;           // 本月收入
  activeSubscriptions: number;    // 活跃订阅数
  newSubscriptions: number;       // 本月新增订阅
  canceledSubscriptions: number;  // 本月取消订阅
  mrr: number;                    // 月度经常性收入 (MRR)
  currency: string;               // 货币类型
  lastSync: string;               // 最后同步时间
}
```

---

### 3.2 关键指标说明

#### MRR (Monthly Recurring Revenue)
月度经常性收入，SaaS 业务的核心指标。

**计算方式:**
- 月付订阅：直接计入
- 年付订阅：除以 12
- 周付订阅：乘以 4.33

**示例:**
```
10 个月付订阅 × $29 = $290
5 个年付订阅 × $299 ÷ 12 = $124.58
总 MRR = $414.58
```

---

#### 流失率 (Churn Rate)
取消订阅数 ÷ 活跃订阅数 × 100%

**健康标准:**
- 优秀: < 3%
- 良好: 3-5%
- 需改进: > 5%

---

## 🎨 第四步：Dashboard 组件实现

### 4.1 收入卡片组件

**文件:** `src/components/soloboard/creem-revenue-cards.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, UserPlus, UserMinus, Repeat } from 'lucide-react';

interface CreemRevenueCardsProps {
  data: {
    todayRevenue: number;
    monthRevenue: number;
    activeSubscriptions: number;
    newSubscriptions: number;
    canceledSubscriptions: number;
    mrr: number;
    currency: string;
  };
}

export function CreemRevenueCards({ data }: CreemRevenueCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency,
    }).format(amount);
  };

  const churnRate = data.activeSubscriptions > 0
    ? (data.canceledSubscriptions / data.activeSubscriptions * 100).toFixed(2)
    : '0.00';

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {/* 今日收入 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data.todayRevenue)}
          </div>
          <p className="text-xs text-muted-foreground">
            From subscriptions
          </p>
        </CardContent>
      </Card>

      {/* 本月收入 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data.monthRevenue)}
          </div>
          <p className="text-xs text-muted-foreground">
            This month
          </p>
        </CardContent>
      </Card>

      {/* MRR */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">MRR</CardTitle>
          <Repeat className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data.mrr)}
          </div>
          <p className="text-xs text-muted-foreground">
            Monthly recurring
          </p>
        </CardContent>
      </Card>

      {/* 活跃订阅 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Subs</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.activeSubscriptions.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Subscribers
          </p>
        </CardContent>
      </Card>

      {/* 新增订阅 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Subs</CardTitle>
          <UserPlus className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            +{data.newSubscriptions}
          </div>
          <p className="text-xs text-muted-foreground">
            This month
          </p>
        </CardContent>
      </Card>

      {/* 取消订阅 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
          <UserMinus className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {churnRate}%
          </div>
          <p className="text-xs text-muted-foreground">
            {data.canceledSubscriptions} canceled
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 4.2 MRR 趋势图

**文件:** `src/components/soloboard/creem-mrr-chart.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MRRChartProps {
  data: Array<{
    date: string;
    mrr: number;
    newMrr: number;
    churnedMrr: number;
  }>;
}

export function CreemMRRChart({ data }: MRRChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>MRR Trend (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="mrr" 
              stroke="#8884d8" 
              strokeWidth={2}
              name="Total MRR"
            />
            <Line 
              type="monotone" 
              dataKey="newMrr" 
              stroke="#82ca9d" 
              strokeWidth={2}
              name="New MRR"
            />
            <Line 
              type="monotone" 
              dataKey="churnedMrr" 
              stroke="#ff7c7c" 
              strokeWidth={2}
              name="Churned MRR"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

### 4.3 订阅统计卡片

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface SubscriptionStatsProps {
  data: {
    activeSubscriptions: number;
    newSubscriptions: number;
    canceledSubscriptions: number;
    mrr: number;
  };
}

export function SubscriptionStats({ data }: SubscriptionStatsProps) {
  const growthRate = data.activeSubscriptions > 0
    ? ((data.newSubscriptions - data.canceledSubscriptions) / data.activeSubscriptions * 100).toFixed(2)
    : '0.00';

  const retentionRate = data.activeSubscriptions > 0
    ? ((data.activeSubscriptions - data.canceledSubscriptions) / data.activeSubscriptions * 100).toFixed(2)
    : '100.00';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 增长率 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Growth Rate</span>
            <span className="font-bold text-green-600">+{growthRate}%</span>
          </div>
          <Progress value={parseFloat(growthRate)} className="h-2" />
        </div>

        {/* 留存率 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Retention Rate</span>
            <span className="font-bold">{retentionRate}%</span>
          </div>
          <Progress value={parseFloat(retentionRate)} className="h-2" />
        </div>

        {/* 平均订阅价值 */}
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Avg. Subscription Value</span>
          <span className="font-bold">
            ${(data.mrr / data.activeSubscriptions).toFixed(2)}
          </span>
        </div>

        {/* LTV 预估 */}
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Est. LTV (12 months)</span>
          <span className="font-bold">
            ${((data.mrr / data.activeSubscriptions) * 12).toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 🔄 第五步：集成到同步服务

### 5.1 更新 sync-service.ts

**文件:** `src/shared/services/soloboard/sync-service.ts`

```typescript
import { fetchCreemMetrics } from './platform-fetchers/creem-fetcher';

export async function syncCreemSite(site: MonitoredSite) {
  try {
    // 解密 API 配置
    const config = decryptApiConfig(site.apiConfig);
    
    // 抓取 Creem 数据
    const metrics = await fetchCreemMetrics({
      apiKey: config.creemApiKey,
    });
    
    // 保存到数据库
    await db.update(monitoredSites)
      .set({
        lastSnapshot: {
          todayRevenue: metrics.todayRevenue,
          monthRevenue: metrics.monthRevenue,
          activeSubscriptions: metrics.activeSubscriptions,
          newSubscriptions: metrics.newSubscriptions,
          canceledSubscriptions: metrics.canceledSubscriptions,
          mrr: metrics.mrr,
          currency: metrics.currency,
          churnRate: (metrics.canceledSubscriptions / metrics.activeSubscriptions * 100).toFixed(2),
          updatedAt: metrics.lastSync,
        },
        lastSyncAt: new Date(),
      })
      .where(eq(monitoredSites.id, site.id));
    
    // 记录历史数据
    await db.insert(siteMetricsHistory).values({
      id: nanoid(),
      siteId: site.id,
      metrics: metrics,
      createdAt: new Date(),
    });
    
    console.log(`✅ Creem sync completed for ${site.name}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Creem sync failed for ${site.name}:`, error);
    return { success: false, error };
  }
}
```

---

## 🎯 第六步：添加 Creem 站点

### 6.1 前端表单

**文件:** `src/components/soloboard/add-creem-site-form.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function AddCreemSiteForm() {
  const [apiKey, setApiKey] = useState('');
  const [siteName, setSiteName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/soloboard/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: siteName || 'Creem Subscriptions',
          platform: 'creem',
          url: 'https://creem.io',
          apiConfig: { 
            creemApiKey: apiKey 
          },
        }),
      });

      if (response.ok) {
        toast.success('Creem site added successfully!');
        setApiKey('');
        setSiteName('');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add Creem site');
      }
    } catch (error) {
      console.error('Failed to add Creem site:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="siteName">Site Name</Label>
        <Input
          id="siteName"
          type="text"
          placeholder="My SaaS Product"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
        />
      </div>
      
      <div>
        <Label htmlFor="apiKey">Creem API Key</Label>
        <Input
          id="apiKey"
          type="password"
          placeholder="creem_live_..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Get your API key from Creem Dashboard → Settings → API Keys
        </p>
      </div>
      
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Adding...' : 'Add Creem Site'}
      </Button>
    </form>
  );
}
```

---

## 📈 第七步：高级功能

### 7.1 订阅生命周期分析

```typescript
export function SubscriptionLifecycle({ data }: { data: any[] }) {
  const stages = [
    { name: 'Trial', count: data.filter(s => s.status === 'trial').length },
    { name: 'Active', count: data.filter(s => s.status === 'active').length },
    { name: 'Past Due', count: data.filter(s => s.status === 'past_due').length },
    { name: 'Canceled', count: data.filter(s => s.status === 'canceled').length },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Lifecycle</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage) => (
            <div key={stage.name} className="flex items-center justify-between">
              <span className="text-sm font-medium">{stage.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{stage.count}</span>
                <Progress 
                  value={(stage.count / data.length) * 100} 
                  className="w-24 h-2"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 7.2 收入预测

```typescript
export function RevenueForecasting({ historicalData }: { historicalData: any[] }) {
  // 简单的线性回归预测
  const predictNextMonth = () => {
    const recentMonths = historicalData.slice(-3);
    const avgGrowth = recentMonths.reduce((sum, month, i) => {
      if (i === 0) return 0;
      return sum + ((month.mrr - recentMonths[i-1].mrr) / recentMonths[i-1].mrr);
    }, 0) / (recentMonths.length - 1);

    const currentMRR = recentMonths[recentMonths.length - 1].mrr;
    return currentMRR * (1 + avgGrowth);
  };

  const forecast = predictNextMonth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Next Month (Estimated)</p>
            <p className="text-3xl font-bold">${forecast.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Annual Run Rate (ARR)</p>
            <p className="text-2xl font-bold">${(forecast * 12).toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 🔐 安全最佳实践

### 1. API Key 管理

```typescript
// 加密存储
import { encrypt, decrypt } from '@/lib/encryption';

const encryptedConfig = encrypt(JSON.stringify({
  creemApiKey: apiKey,
}));

// 使用时解密
const config = JSON.parse(decrypt(encryptedConfig));
```

---

### 2. 错误处理

```typescript
try {
  const metrics = await fetchCreemMetrics(config);
} catch (error) {
  if (error.message.includes('401')) {
    // API Key 无效
    await notifyUser('Creem API Key is invalid');
  } else if (error.message.includes('429')) {
    // 速率限制
    await sleep(60000);
    return retry();
  }
}
```

---

## 📊 Creem vs Stripe 对比

| 功能 | Creem | Stripe |
|------|-------|--------|
| **订阅管理** | ✅ 原生支持 | ✅ 原生支持 |
| **MRR 追踪** | ✅ 内置 | ⚠️ 需计算 |
| **流失分析** | ✅ 内置 | ⚠️ 需计算 |
| **定价** | 更低 | 标准 |
| **API 文档** | 良好 | 优秀 |
| **适用场景** | SaaS 订阅 | 通用支付 |

---

## 🎉 完成后的效果

### Dashboard 完整布局

```
┌─────────────────────────────────────────────────────────────┐
│  💳 Creem Dashboard                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┐              │
│  │今日  │本月  │ MRR  │活跃  │新增  │流失  │              │
│  │$1.2K │$45K  │$12K  │1234  │+56   │0.97% │              │
│  └──────┴──────┴──────┴──────┴──────┴──────┘              │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  📈 MRR Trend (Last 30 Days)                          │ │
│  │  [折线图：总MRR、新增MRR、流失MRR]                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────┬─────────────────────────────────┐ │
│  │ 🎯 Subscription     │ 📊 Revenue Forecast             │ │
│  │    Health           │                                 │ │
│  │ Growth: +15%        │ Next Month: $13,500             │ │
│  │ Retention: 99.03%   │ ARR: $162,000                   │ │
│  │ Avg Value: $9.99    │                                 │ │
│  └─────────────────────┴─────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 快速开始（3 步）

### 步骤 1: 获取 API Key（2 分钟）
访问 https://creem.io/dashboard → Settings → API Keys

### 步骤 2: 配置环境变量（1 分钟）
```bash
CREEM_API_KEY=creem_live_abc123xyz...
```

### 步骤 3: 添加站点（1 分钟）
在 SoloBoard Dashboard 添加 Creem 站点

---

## 📝 测试清单

- [ ] Creem API Key 已获取
- [ ] 环境变量已配置（本地 + Vercel）
- [ ] 站点已添加到 SoloBoard
- [ ] 手动触发同步成功
- [ ] Dashboard 显示数据正确
- [ ] MRR 计算准确
- [ ] 流失率显示正常
- [ ] 每 15 分钟自动更新
- [ ] 多币种支持正常

---

## 💡 营销卖点

```
💳 Creem Subscription Analytics
Track your SaaS metrics in real-time.
MRR, Churn, Growth - all in one place.

✨ Features:
- Real-time MRR tracking
- Churn rate monitoring
- Growth analytics
- Revenue forecasting
- 15-minute auto-sync
- Beautiful visualizations

🚀 Perfect for SaaS Founders
Focus on building, not spreadsheets.
```

---

**🎊 恭喜！现在您可以实时监控 Creem 订阅数据了！**

需要我帮您实现其他功能吗？
- 📧 订阅提醒（即将到期、支付失败）
- 📊 客户细分分析
- 🎯 收入目标追踪
- 📱 移动端推送通知












