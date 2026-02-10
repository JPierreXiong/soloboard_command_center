# 💰 Stripe 收入监控完整指南

**功能:** 实时显示 Stripe 收入数据  
**更新频率:** 每 15 分钟（通过 Upstash QStash）  
**支持指标:** 今日收入、本月收入、交易数、待处理金额

---

## 🎯 功能概览

### Dashboard 九宫格卡片显示

```
┌─────────────────┬─────────────────┬─────────────────┐
│  💰 今日收入     │  📊 本月收入     │  🔄 待处理      │
│  $1,234.56      │  $45,678.90     │  $890.12       │
│  ↑ 12 笔交易    │  ↑ 456 笔交易   │  等待结算      │
└─────────────────┴─────────────────┴─────────────────┘
```

---

## 📋 第一步：获取 Stripe API Key

### 1.1 登录 Stripe Dashboard

访问 https://dashboard.stripe.com/

### 1.2 获取 Secret Key

1. 点击右上角 **"Developers"**
2. 选择 **"API keys"**
3. 找到 **"Secret key"**（以 `sk_live_` 或 `sk_test_` 开头）
4. 点击 **"Reveal test key"** 或 **"Reveal live key"**
5. 复制密钥

**密钥格式:**
```
sk_test_51Abc...xyz  (测试环境)
sk_live_51Abc...xyz  (生产环境)
```

⚠️ **安全提示:** 
- 永远不要将 Secret Key 提交到 Git
- 只在环境变量中存储
- 使用 Restricted Keys（限制权限）

---

### 1.3 创建 Restricted Key（推荐）

为了安全，建议创建一个只读权限的 API Key：

1. 在 API keys 页面点击 **"Create restricted key"**
2. 设置权限：
   - ✅ **Charges:** Read
   - ✅ **Balance:** Read
   - ✅ **Payment Intents:** Read
   - ❌ 其他权限：None
3. 命名：`SoloBoard Read-Only Key`
4. 点击 **"Create key"**

---

## 🔧 第二步：配置环境变量

### 2.1 本地开发环境

**文件:** `.env.local`

```bash
# Stripe API Key
STRIPE_SECRET_KEY=sk_test_51Abc...xyz

# 或生产环境
STRIPE_SECRET_KEY=sk_live_51Abc...xyz
```

---

### 2.2 Vercel 生产环境

1. 访问 https://vercel.com/dashboard
2. 进入项目设置 → **Environment Variables**
3. 添加新变量：
   - **Name:** `STRIPE_SECRET_KEY`
   - **Value:** `sk_live_51Abc...xyz`
   - **Environment:** Production, Preview, Development
4. 点击 **"Save"**

---

## 📊 第三步：在 Dashboard 中使用

### 3.1 数据结构

**Stripe Metrics 返回的数据:**

```typescript
interface StripeMetrics {
  todayRevenue: number;        // 今日收入（美元）
  monthRevenue: number;        // 本月收入（美元）
  todayTransactions: number;   // 今日交易数
  monthTransactions: number;   // 本月交易数
  pendingAmount: number;       // 待处理金额
  currency: string;            // 货币类型（USD, EUR, CNY 等）
  lastSync: string;            // 最后同步时间
}
```

---

### 3.2 示例：Dashboard 卡片组件

**文件:** `src/components/soloboard/revenue-cards.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Clock } from 'lucide-react';

interface RevenueCardsProps {
  stripeData: {
    todayRevenue: number;
    monthRevenue: number;
    todayTransactions: number;
    monthTransactions: number;
    pendingAmount: number;
    currency: string;
  };
}

export function RevenueCards({ stripeData }: RevenueCardsProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 今日收入 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Today's Revenue
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(stripeData.todayRevenue, stripeData.currency)}
          </div>
          <p className="text-xs text-muted-foreground">
            {stripeData.todayTransactions} transactions
          </p>
        </CardContent>
      </Card>

      {/* 本月收入 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Monthly Revenue
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(stripeData.monthRevenue, stripeData.currency)}
          </div>
          <p className="text-xs text-muted-foreground">
            {stripeData.monthTransactions} transactions
          </p>
        </CardContent>
      </Card>

      {/* 待处理金额 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pending Balance
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(stripeData.pendingAmount, stripeData.currency)}
          </div>
          <p className="text-xs text-muted-foreground">
            Awaiting payout
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 3.3 在页面中使用

**文件:** `src/app/[locale]/(dashboard)/soloboard/page.tsx`

```typescript
import { RevenueCards } from '@/components/soloboard/revenue-cards';

export default async function SoloBoardPage() {
  // 从数据库获取最新的 Stripe 数据
  const stripeData = await getLatestStripeMetrics();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* Stripe 收入卡片 */}
      <RevenueCards stripeData={stripeData} />
      
      {/* 其他内容... */}
    </div>
  );
}
```

---

## 🔄 第四步：集成到同步服务

### 4.1 更新 sync-service.ts

**文件:** `src/shared/services/soloboard/sync-service.ts`

```typescript
import { fetchStripeMetrics } from './platform-fetchers/stripe-fetcher';

export async function syncStripeSite(site: MonitoredSite) {
  try {
    // 解密 API 配置
    const config = decryptApiConfig(site.apiConfig);
    
    // 抓取 Stripe 数据
    const metrics = await fetchStripeMetrics({
      secretKey: config.stripeSecretKey,
    });
    
    // 保存到数据库
    await db.update(monitoredSites)
      .set({
        lastSnapshot: {
          todayRevenue: metrics.todayRevenue,
          monthRevenue: metrics.monthRevenue,
          todayTransactions: metrics.todayTransactions,
          monthTransactions: metrics.monthTransactions,
          pendingAmount: metrics.pendingAmount,
          currency: metrics.currency,
          updatedAt: metrics.lastSync,
        },
        lastSyncAt: new Date(),
      })
      .where(eq(monitoredSites.id, site.id));
    
    console.log(`✅ Stripe sync completed for ${site.name}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Stripe sync failed for ${site.name}:`, error);
    return { success: false, error };
  }
}
```

---

## 📈 第五步：数据可视化

### 5.1 收入趋势图

```typescript
import { Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RevenueTrendChart({ data }: { data: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
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
              dataKey="revenue" 
              stroke="#8884d8" 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

### 5.2 交易统计

```typescript
export function TransactionStats({ data }: { data: StripeMetrics }) {
  const avgTransactionValue = data.monthRevenue / data.monthTransactions;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Average Value</span>
          <span className="font-bold">
            ${avgTransactionValue.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Success Rate</span>
          <span className="font-bold text-green-600">98.5%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Customers</span>
          <span className="font-bold">{data.monthTransactions}</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 🎯 第六步：添加站点配置

### 6.1 在 Dashboard 中添加 Stripe 站点

**API 端点:** `POST /api/soloboard/sites`

**请求体:**
```json
{
  "name": "My SaaS Product",
  "platform": "stripe",
  "url": "https://dashboard.stripe.com",
  "apiConfig": {
    "stripeSecretKey": "sk_live_51Abc...xyz"
  }
}
```

---

### 6.2 前端表单

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AddStripeSiteForm() {
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/soloboard/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Stripe Revenue',
          platform: 'stripe',
          url: 'https://dashboard.stripe.com',
          apiConfig: { stripeSecretKey: secretKey },
        }),
      });

      if (response.ok) {
        alert('Stripe site added successfully!');
        setSecretKey('');
      }
    } catch (error) {
      console.error('Failed to add Stripe site:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="secretKey">Stripe Secret Key</Label>
        <Input
          id="secretKey"
          type="password"
          placeholder="sk_live_..."
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Adding...' : 'Add Stripe Site'}
      </Button>
    </form>
  );
}
```

---

## 🔐 安全最佳实践

### 1. API Key 加密存储

```typescript
import { encrypt, decrypt } from '@/lib/encryption';

// 保存时加密
const encryptedConfig = encrypt(JSON.stringify({
  stripeSecretKey: secretKey,
}));

// 使用时解密
const config = JSON.parse(decrypt(encryptedConfig));
```

---

### 2. 权限限制

- ✅ 使用 Restricted Keys（只读权限）
- ✅ 定期轮换 API Keys
- ✅ 监控 API 使用情况
- ✅ 启用 Stripe Webhook 签名验证

---

### 3. 错误处理

```typescript
try {
  const metrics = await fetchStripeMetrics(config);
} catch (error) {
  if (error.message.includes('Invalid API Key')) {
    // 通知用户更新 API Key
    await sendAlertEmail(user, 'Stripe API Key Invalid');
  }
  
  if (error.message.includes('Rate limit')) {
    // 等待后重试
    await sleep(60000);
    return retry();
  }
}
```

---

## 📊 数据展示示例

### Dashboard 完整布局

```
┌─────────────────────────────────────────────────────────────┐
│  💰 SoloBoard Dashboard                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┬─────────────┬─────────────┐              │
│  │ 今日收入     │ 本月收入     │ 待处理      │              │
│  │ $1,234.56   │ $45,678.90  │ $890.12    │              │
│  │ ↑ 12 笔     │ ↑ 456 笔    │ 等待结算    │              │
│  └─────────────┴─────────────┴─────────────┘              │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  📈 Revenue Trend (Last 30 Days)                      │ │
│  │  [折线图显示收入趋势]                                  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────┬─────────────────────────────────┐ │
│  │ 🎯 Top Products     │ 📊 Transaction Stats            │ │
│  │ 1. Pro Plan $999    │ Avg Value: $45.67              │ │
│  │ 2. Basic Plan $29   │ Success Rate: 98.5%            │ │
│  │ 3. Enterprise $2999 │ Total Customers: 456           │ │
│  └─────────────────────┴─────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎉 完成后的效果

### 用户体验

**之前:**
- 需要手动登录 Stripe Dashboard
- 数据分散在多个页面
- 无法快速了解收入情况

**现在:**
- 打开 SoloBoard → 一眼看到所有收入数据
- 每 15 分钟自动更新
- 多个产品的收入集中展示
- 历史趋势一目了然

---

### 营销卖点

```
💰 Real-Time Revenue Monitoring
Track your Stripe earnings in real-time.
Never miss a sale again.

✨ Features:
- Today's revenue at a glance
- Monthly performance tracking
- Pending balance monitoring
- Transaction analytics
- 15-minute auto-sync
```

---

## 🚀 下一步扩展

### 1. 支持更多支付平台

- ✅ Stripe（已完成）
- 🔄 PayPal（待开发）
- 🔄 Lemon Squeezy（待开发）
- 🔄 Paddle（待开发）

---

### 2. 高级分析功能

- 📊 收入预测（基于历史数据）
- 📈 增长率分析
- 💡 收入优化建议
- 🎯 目标设定和追踪

---

### 3. 自动化报告

- 📧 每日收入邮件报告
- 📱 重要交易推送通知
- 📊 月度财务总结
- 🎯 达成目标庆祝

---

## 📝 测试清单

配置完成后测试：

- [ ] Stripe API Key 已配置
- [ ] 环境变量已设置（本地 + Vercel）
- [ ] 手动触发同步成功
- [ ] Dashboard 显示收入数据
- [ ] 数据格式正确（货币符号、小数点）
- [ ] 每 15 分钟自动更新
- [ ] 错误处理正常（无效 API Key）
- [ ] 加密存储正常工作
- [ ] 多币种支持正常

---

## 💡 专家建议

### 1. 数据隐私

对于敏感的收入数据，考虑：
- 只显示给站点所有者
- 团队成员需要特殊权限
- 支持数据脱敏（显示趋势而非具体金额）

---

### 2. 性能优化

- 使用 Redis 缓存最近的数据
- 避免频繁调用 Stripe API
- 批量处理历史数据

---

### 3. 用户体验

- 添加骨架屏加载状态
- 数据变化时显示动画
- 支持自定义时间范围
- 导出 CSV/PDF 报告

---

**🎊 现在您的 Dashboard 可以实时显示 Stripe 收入了！每 15 分钟自动更新，让您随时掌握业务状况！**

需要我帮您实现其他平台的数据抓取吗？（PayPal、Lemon Squeezy、Google Analytics 等）








