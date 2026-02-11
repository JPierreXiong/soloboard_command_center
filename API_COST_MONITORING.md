# API 成本监控实现方案

## 📊 监控目标

1. **实时追踪** 每个用户的 API 调用次数
2. **成本预警** 接近配额限制时通知
3. **异常检测** 识别异常调用模式
4. **数据分析** 为定价优化提供数据支持

---

## 🗄️ 数据库 Schema 扩展

### 1. API 使用日志表

```typescript
// src/config/db/schema.ts

export const apiUsageLogs = pgTable(
  'api_usage_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    siteId: text('site_id')
      .notNull()
      .references(() => monitoredSites.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(), // 'GA4', 'STRIPE', etc.
    apiCallCount: integer('api_call_count').default(1).notNull(),
    success: boolean('success').default(true).notNull(),
    errorMessage: text('error_message'),
    responseTime: integer('response_time'), // 毫秒
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (table) => [
    index('idx_api_usage_user_date').on(table.userId, table.timestamp),
    index('idx_api_usage_site').on(table.siteId),
    index('idx_api_usage_platform').on(table.platform),
  ]
);

export const apiUsageStats = pgTable(
  'api_usage_stats',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD
    platform: text('platform').notNull(),
    totalCalls: integer('total_calls').default(0).notNull(),
    successfulCalls: integer('successful_calls').default(0).notNull(),
    failedCalls: integer('failed_calls').default(0).notNull(),
    averageResponseTime: integer('average_response_time'), // 毫秒
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_api_stats_user_date').on(table.userId, table.date),
    // 唯一约束：每个用户每天每个平台只有一条记录
    index('idx_api_stats_unique').on(table.userId, table.date, table.platform),
  ]
);
```

---

## 🔧 API 调用追踪服务

### 2. API 追踪中间件

```typescript
// src/shared/services/soloboard/api-tracker.ts

import { db } from '@/core/db';
import { apiUsageLogs, apiUsageStats } from '@/config/db/schema';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';

export interface ApiCallMetadata {
  userId: string;
  siteId: string;
  platform: 'GA4' | 'STRIPE' | 'UPTIME' | 'LEMON_SQUEEZY' | 'SHOPIFY';
  apiCallCount?: number;
}

export interface ApiCallResult {
  success: boolean;
  errorMessage?: string;
  responseTime: number; // 毫秒
}

/**
 * 记录 API 调用
 */
export async function trackApiCall(
  metadata: ApiCallMetadata,
  result: ApiCallResult
) {
  try {
    const logId = nanoid();
    
    // 1. 记录详细日志
    await db().insert(apiUsageLogs).values({
      id: logId,
      userId: metadata.userId,
      siteId: metadata.siteId,
      platform: metadata.platform,
      apiCallCount: metadata.apiCallCount || 1,
      success: result.success,
      errorMessage: result.errorMessage,
      responseTime: result.responseTime,
      timestamp: new Date(),
    });
    
    // 2. 更新每日统计
    await updateDailyStats(metadata, result);
    
    // 3. 检查配额预警
    await checkQuotaWarning(metadata.userId, metadata.platform);
  } catch (error) {
    console.error('Failed to track API call:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 更新每日统计
 */
async function updateDailyStats(
  metadata: ApiCallMetadata,
  result: ApiCallResult
) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // 查询今日统计
  const existing = await db()
    .select()
    .from(apiUsageStats)
    .where(
      and(
        eq(apiUsageStats.userId, metadata.userId),
        eq(apiUsageStats.date, today),
        eq(apiUsageStats.platform, metadata.platform)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);
  
  if (existing) {
    // 更新现有记录
    const newTotalCalls = existing.totalCalls + (metadata.apiCallCount || 1);
    const newSuccessfulCalls = result.success
      ? existing.successfulCalls + 1
      : existing.successfulCalls;
    const newFailedCalls = result.success
      ? existing.failedCalls
      : existing.failedCalls + 1;
    
    // 计算新的平均响应时间
    const newAverageResponseTime = Math.round(
      ((existing.averageResponseTime || 0) * existing.totalCalls + result.responseTime) /
        newTotalCalls
    );
    
    await db()
      .update(apiUsageStats)
      .set({
        totalCalls: newTotalCalls,
        successfulCalls: newSuccessfulCalls,
        failedCalls: newFailedCalls,
        averageResponseTime: newAverageResponseTime,
        updatedAt: new Date(),
      })
      .where(eq(apiUsageStats.id, existing.id));
  } else {
    // 创建新记录
    await db().insert(apiUsageStats).values({
      id: nanoid(),
      userId: metadata.userId,
      date: today,
      platform: metadata.platform,
      totalCalls: metadata.apiCallCount || 1,
      successfulCalls: result.success ? 1 : 0,
      failedCalls: result.success ? 0 : 1,
      averageResponseTime: result.responseTime,
    });
  }
}

/**
 * 检查配额预警
 */
async function checkQuotaWarning(userId: string, platform: string) {
  const today = new Date().toISOString().split('T')[0];
  
  const stats = await db()
    .select()
    .from(apiUsageStats)
    .where(
      and(
        eq(apiUsageStats.userId, userId),
        eq(apiUsageStats.date, today),
        eq(apiUsageStats.platform, platform)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);
  
  if (!stats) return;
  
  // 定义配额限制（根据平台）
  const quotaLimits: Record<string, number> = {
    GA4: 25000, // 每天 25,000 次
    STRIPE: 100000, // 实际无限制，设置一个高值
    UPTIME: 10000,
    LEMON_SQUEEZY: 10000,
    SHOPIFY: 10000,
  };
  
  const limit = quotaLimits[platform] || 10000;
  const usagePercent = (stats.totalCalls / limit) * 100;
  
  // 达到 80% 时发送预警
  if (usagePercent >= 80) {
    console.warn(
      `⚠️ API Quota Warning: User ${userId} has used ${usagePercent.toFixed(1)}% of ${platform} quota`
    );
    
    // TODO: 发送邮件通知
    // await sendQuotaWarningEmail(userId, platform, usagePercent);
  }
}

/**
 * 获取用户的 API 使用统计
 */
export async function getUserApiUsage(
  userId: string,
  startDate: string,
  endDate: string
) {
  const stats = await db()
    .select()
    .from(apiUsageStats)
    .where(
      and(
        eq(apiUsageStats.userId, userId),
        // TODO: 添加日期范围过滤
      )
    )
    .orderBy(apiUsageStats.date);
  
  return stats;
}

/**
 * 获取平台的总体使用统计
 */
export async function getPlatformUsageStats(platform: string, date: string) {
  // TODO: 实现聚合查询
  return {
    platform,
    date,
    totalUsers: 0,
    totalCalls: 0,
    averageCallsPerUser: 0,
  };
}
```

---

## 🔌 集成到数据抓取服务

### 3. 修改 GA4 Fetcher

```typescript
// src/shared/services/soloboard/ga4-fetcher.ts

import { trackApiCall } from './api-tracker';

export async function fetchGA4Metrics(
  config: NonNullable<SiteApiConfig['ga4']>,
  metadata: { userId: string; siteId: string }
): Promise<GA4Metrics> {
  const startTime = Date.now();
  
  try {
    // ... 原有的 GA4 API 调用代码 ...
    
    const responseTime = Date.now() - startTime;
    
    // 记录成功的 API 调用
    await trackApiCall(
      {
        userId: metadata.userId,
        siteId: metadata.siteId,
        platform: 'GA4',
        apiCallCount: 2, // 实时 + 今日统计 = 2 次调用
      },
      {
        success: true,
        responseTime,
      }
    );
    
    return {
      activeUsers,
      pageViews,
      sessions,
      newUsers,
      averageSessionDuration,
      bounceRate,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // 记录失败的 API 调用
    await trackApiCall(
      {
        userId: metadata.userId,
        siteId: metadata.siteId,
        platform: 'GA4',
        apiCallCount: 2,
      },
      {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      }
    );
    
    throw error;
  }
}
```

---

## 📊 管理后台 API

### 4. API 使用统计端点

```typescript
// src/app/api/admin/api-usage/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { apiUsageStats } from '@/config/db/schema';
import { auth } from '@/core/auth';
import { eq, gte, lte, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 获取 API 使用统计（管理员）
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // TODO: 检查管理员权限
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || getDateDaysAgo(30);
    const endDate = searchParams.get('endDate') || getTodayDate();
    const platform = searchParams.get('platform');
    
    // 查询统计数据
    let query = db()
      .select()
      .from(apiUsageStats)
      .where(
        and(
          gte(apiUsageStats.date, startDate),
          lte(apiUsageStats.date, endDate),
          platform ? eq(apiUsageStats.platform, platform) : undefined
        )
      );
    
    const stats = await query;
    
    // 计算总计
    const summary = {
      totalCalls: stats.reduce((sum, s) => sum + s.totalCalls, 0),
      successfulCalls: stats.reduce((sum, s) => sum + s.successfulCalls, 0),
      failedCalls: stats.reduce((sum, s) => sum + s.failedCalls, 0),
      averageResponseTime: Math.round(
        stats.reduce((sum, s) => sum + (s.averageResponseTime || 0), 0) / stats.length
      ),
      successRate: 0,
    };
    
    summary.successRate =
      summary.totalCalls > 0
        ? (summary.successfulCalls / summary.totalCalls) * 100
        : 0;
    
    return NextResponse.json({
      success: true,
      data: stats,
      summary,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error('Failed to fetch API usage stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}
```

---

## 📈 前端展示组件

### 5. API 使用仪表盘

```typescript
// src/app/[locale]/(admin)/admin/api-usage/page.tsx

'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ApiUsagePage() {
  const [platform, setPlatform] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  
  const { data, error, isLoading } = useSWR(
    `/api/admin/api-usage?platform=${platform}&days=${dateRange}`,
    fetcher,
    { refreshInterval: 60000 }
  );
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;
  
  const { summary } = data;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">API Usage Statistics</h1>
        
        <div className="flex items-center space-x-4">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="GA4">Google Analytics</SelectItem>
              <SelectItem value="STRIPE">Stripe</SelectItem>
              <SelectItem value="UPTIME">Uptime Monitor</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total API Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalCalls.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {summary.successRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Failed Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {summary.failedCalls.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {summary.averageResponseTime}ms
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* TODO: 添加图表展示 */}
    </div>
  );
}
```

---

## 🚨 告警系统

### 6. 配额预警邮件

```typescript
// src/shared/services/soloboard/quota-alerts.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendQuotaWarningEmail(
  userId: string,
  platform: string,
  usagePercent: number
) {
  try {
    // 获取用户邮箱
    const user = await db()
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1)
      .then((rows) => rows[0]);
    
    if (!user?.email) return;
    
    await resend.emails.send({
      from: 'SoloBoard <noreply@soloboard.com>',
      to: user.email,
      subject: `⚠️ API Quota Warning: ${platform} at ${usagePercent.toFixed(0)}%`,
      html: `
        <h2>API Quota Warning</h2>
        <p>Your ${platform} API usage has reached ${usagePercent.toFixed(1)}% of the daily limit.</p>
        <p>To avoid service interruption, please consider:</p>
        <ul>
          <li>Reducing sync frequency</li>
          <li>Removing unused sites</li>
          <li>Upgrading to a higher plan</li>
        </ul>
        <p>Current usage will reset at midnight UTC.</p>
      `,
    });
    
    console.log(`✅ Quota warning email sent to ${user.email}`);
  } catch (error) {
    console.error('Failed to send quota warning email:', error);
  }
}
```

---

## 📝 实施步骤

### Phase 1: 数据库 Schema（1 天）
1. 添加 `api_usage_logs` 表
2. 添加 `api_usage_stats` 表
3. 运行数据库迁移

### Phase 2: API 追踪（2 天）
1. 实现 `trackApiCall` 函数
2. 集成到所有 fetcher 服务
3. 测试日志记录

### Phase 3: 统计分析（2 天）
1. 实现每日统计聚合
2. 创建管理后台 API
3. 添加前端展示页面

### Phase 4: 告警系统（1 天）
1. 实现配额检查
2. 集成邮件通知
3. 测试告警触发

---

## 🎯 预期效果

### 数据洞察
- 📊 实时了解 API 使用情况
- 📈 识别使用趋势和异常
- 💰 精确计算成本

### 成本控制
- ⚠️ 提前预警配额超限
- 🔒 防止意外超支
- 📉 优化 API 调用策略

### 用户体验
- ✅ 透明的使用统计
- 📧 主动告警通知
- 🎯 合理的限额管理

---

**下一步**: 开始实施 Phase 1，添加数据库 Schema

