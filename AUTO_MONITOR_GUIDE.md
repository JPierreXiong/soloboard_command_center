# 🌐 自动网站监控完整指南

**功能:** 客户输入网址，自动监控网站状态和性能  
**更新频率:** 每 15 分钟（通过 Upstash QStash）  
**零配置:** 无需 API Key，输入网址即可开始

---

## 🎯 功能概览

### 一键监控，无需配置

```
客户输入: https://example.com
         ↓
系统自动抓取:
✅ 网站状态（在线/离线）
✅ 响应时间
✅ SSL 证书状态
✅ 页面标题和描述
✅ SEO 分数
✅ 页面加载速度
✅ 技术栈检测
✅ 内容统计
```

---

## 📊 监控指标说明

### 1. 基础状态

| 指标 | 说明 | 示例 |
|------|------|------|
| **在线状态** | 网站是否可访问 | ✅ 在线 / ❌ 离线 |
| **状态码** | HTTP 响应码 | 200, 404, 500 等 |
| **响应时间** | 服务器响应速度 | 234 ms |

---

### 2. SSL 证书

| 指标 | 说明 | 示例 |
|------|------|------|
| **SSL 状态** | 是否使用 HTTPS | ✅ 有效 / ❌ 无效 |
| **证书到期** | 证书过期时间 | 2026-12-31 |

---

### 3. SEO 指标

| 指标 | 说明 | 评分标准 |
|------|------|---------|
| **SEO 分数** | 综合 SEO 评分 | 0-100 分 |
| **标题标签** | 是否有 title | 有 +25 分 |
| **描述标签** | 是否有 description | 有 +25 分 |
| **OG 标签** | 社交媒体标签 | 有 +20 分 |
| **标题长度** | 10-60 字符 | 符合 +15 分 |
| **描述长度** | 50-160 字符 | 符合 +15 分 |

---

### 4. 性能指标

| 指标 | 说明 | 健康标准 |
|------|------|---------|
| **页面大小** | HTML 文件大小 | < 500 KB |
| **加载时间** | 完整加载时间 | < 3 秒 |
| **图片数量** | 页面图片总数 | 适中 |
| **链接数量** | 页面链接总数 | 适中 |

---

### 5. 内容统计

| 指标 | 说明 |
|------|------|
| **字数统计** | 页面文字总数 |
| **图片数量** | 图片元素数量 |
| **链接数量** | 超链接数量 |

---

### 6. 技术栈检测

自动识别网站使用的技术：

**前端框架:**
- React
- Vue.js
- Angular
- jQuery

**CSS 框架:**
- Bootstrap
- Tailwind CSS

**分析工具:**
- Google Analytics
- Facebook Pixel

**服务器:**
- Nginx
- Apache
- Cloudflare

**CMS:**
- WordPress
- Shopify

---

## 🚀 快速开始（3 步）

### 步骤 1: 添加网站（1 分钟）

在 SoloBoard Dashboard 中：

1. 点击 **"Add Site"**
2. 选择 **"Auto Monitor"**（自动监控）
3. 输入网址：`https://example.com`
4. 点击 **"Start Monitoring"**

**完成！** 🎉 系统将立即开始监控。

---

### 步骤 2: 查看实时数据（即时）

Dashboard 将显示：

```
┌─────────────────────────────────────────────────────────────┐
│  🌐 example.com                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ 在线    234ms    🔒 SSL 有效    SEO: 85/100           │
│                                                             │
│  📊 性能指标                                                │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │页面大小   │加载时间   │图片数    │链接数    │            │
│  │245 KB    │1.2s      │12        │45        │            │
│  └──────────┴──────────┴──────────┴──────────┘            │
│                                                             │
│  🔧 技术栈                                                  │
│  React • Tailwind CSS • Google Analytics • Cloudflare     │
│                                                             │
│  📝 页面信息                                                │
│  标题: Example Domain - Best SaaS Platform                │
│  描述: The best SaaS platform for your business...        │
│  字数: 1,234 words                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 步骤 3: 设置告警（可选）

配置自动告警规则：

```typescript
{
  "rules": [
    {
      "type": "downtime",
      "condition": "isOnline === false",
      "action": "send_email",
      "message": "网站离线！"
    },
    {
      "type": "slow_response",
      "condition": "responseTime > 3000",
      "action": "send_notification",
      "message": "响应时间过慢"
    },
    {
      "type": "ssl_expiry",
      "condition": "sslExpiryDays < 30",
      "action": "send_email",
      "message": "SSL 证书即将过期"
    }
  ]
}
```

---

## 🎨 Dashboard 组件实现

### 网站状态卡片

**文件:** `src/components/soloboard/website-status-card.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Lock, Zap, TrendingUp } from 'lucide-react';

interface WebsiteStatusCardProps {
  data: {
    url: string;
    isOnline: boolean;
    statusCode: number;
    responseTime: number;
    sslValid: boolean;
    seoScore: number;
    title: string;
    description: string;
    technologies: string[];
    lastCheck: string;
  };
}

export function WebsiteStatusCard({ data }: WebsiteStatusCardProps) {
  const getStatusColor = () => {
    if (!data.isOnline) return 'destructive';
    if (data.responseTime > 3000) return 'warning';
    return 'success';
  };

  const getResponseTimeColor = () => {
    if (data.responseTime < 1000) return 'text-green-600';
    if (data.responseTime < 3000) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {data.url}
          </CardTitle>
          <Badge variant={getStatusColor()}>
            {data.isOnline ? '✅ 在线' : '❌ 离线'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 核心指标 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">状态码</p>
            <p className="text-2xl font-bold">{data.statusCode}</p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">响应时间</p>
            <p className={`text-2xl font-bold ${getResponseTimeColor()}`}>
              {data.responseTime}ms
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">SSL</p>
            <p className="text-2xl">
              {data.sslValid ? '🔒' : '⚠️'}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">SEO 分数</p>
            <p className="text-2xl font-bold">{data.seoScore}/100</p>
          </div>
        </div>

        {/* 页面信息 */}
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium">页面标题</p>
            <p className="text-sm text-muted-foreground">{data.title}</p>
          </div>
          <div>
            <p className="text-sm font-medium">页面描述</p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {data.description}
            </p>
          </div>
        </div>

        {/* 技术栈 */}
        {data.technologies.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">技术栈</p>
            <div className="flex flex-wrap gap-2">
              {data.technologies.map((tech) => (
                <Badge key={tech} variant="outline">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 最后检查时间 */}
        <p className="text-xs text-muted-foreground">
          最后检查: {new Date(data.lastCheck).toLocaleString('zh-CN')}
        </p>
      </CardContent>
    </Card>
  );
}
```

---

### SEO 分析卡片

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle } from 'lucide-react';

interface SEOAnalysisCardProps {
  data: {
    seoScore: number;
    metaTags: {
      hasTitle: boolean;
      hasDescription: boolean;
      hasKeywords: boolean;
      hasOgTags: boolean;
    };
    title: string;
    description: string;
  };
}

export function SEOAnalysisCard({ data }: SEOAnalysisCardProps) {
  const checks = [
    {
      label: '标题标签',
      passed: data.metaTags.hasTitle,
      detail: data.title,
    },
    {
      label: '描述标签',
      passed: data.metaTags.hasDescription,
      detail: data.description,
    },
    {
      label: '关键词标签',
      passed: data.metaTags.hasKeywords,
    },
    {
      label: 'Open Graph 标签',
      passed: data.metaTags.hasOgTags,
    },
    {
      label: '标题长度 (10-60)',
      passed: data.title.length >= 10 && data.title.length <= 60,
      detail: `${data.title.length} 字符`,
    },
    {
      label: '描述长度 (50-160)',
      passed: data.description.length >= 50 && data.description.length <= 160,
      detail: `${data.description.length} 字符`,
    },
  ];

  const getSEOGrade = (score: number) => {
    if (score >= 90) return { grade: 'A', color: 'text-green-600' };
    if (score >= 75) return { grade: 'B', color: 'text-blue-600' };
    if (score >= 60) return { grade: 'C', color: 'text-yellow-600' };
    return { grade: 'D', color: 'text-red-600' };
  };

  const { grade, color } = getSEOGrade(data.seoScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO 分析</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* SEO 分数 */}
        <div className="text-center">
          <p className={`text-6xl font-bold ${color}`}>{grade}</p>
          <p className="text-2xl font-semibold mt-2">{data.seoScore}/100</p>
          <Progress value={data.seoScore} className="mt-4" />
        </div>

        {/* 检查项 */}
        <div className="space-y-3">
          {checks.map((check, index) => (
            <div key={index} className="flex items-start gap-3">
              {check.passed ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{check.label}</p>
                {check.detail && (
                  <p className="text-xs text-muted-foreground">{check.detail}</p>
                )}
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

### 性能监控卡片

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceChartProps {
  data: Array<{
    timestamp: string;
    responseTime: number;
    pageSize: number;
  }>;
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>性能趋势（最近 24 小时）</CardTitle>
      </CardHeader>
      
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(value) => new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleString('zh-CN')}
            />
            <Line 
              type="monotone" 
              dataKey="responseTime" 
              stroke="#8884d8" 
              strokeWidth={2}
              name="响应时间 (ms)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

## 🔔 告警规则配置

### 1. 网站离线告警

```typescript
{
  "type": "downtime",
  "condition": "isOnline === false",
  "action": "send_email",
  "recipients": ["admin@example.com"],
  "message": "⚠️ 网站离线！\n\n网站: {{url}}\n时间: {{timestamp}}\n状态码: {{statusCode}}"
}
```

---

### 2. 响应时间告警

```typescript
{
  "type": "slow_response",
  "condition": "responseTime > 3000",
  "action": "send_notification",
  "message": "⏱️ 响应时间过慢\n\n网站: {{url}}\n响应时间: {{responseTime}}ms\n建议: 检查服务器性能"
}
```

---

### 3. SSL 证书告警

```typescript
{
  "type": "ssl_expiry",
  "condition": "sslExpiryDays < 30",
  "action": "send_email",
  "message": "🔒 SSL 证书即将过期\n\n网站: {{url}}\n到期时间: {{sslExpiryDate}}\n剩余天数: {{sslExpiryDays}}"
}
```

---

### 4. SEO 分数告警

```typescript
{
  "type": "low_seo_score",
  "condition": "seoScore < 60",
  "action": "send_notification",
  "message": "📉 SEO 分数过低\n\n网站: {{url}}\nSEO 分数: {{seoScore}}/100\n建议: 优化页面标题和描述"
}
```

---

## 🔄 集成到同步服务

### 更新 sync-service.ts

**文件:** `src/shared/services/soloboard/sync-service.ts`

```typescript
import { autoMonitorWebsite } from './platform-fetchers/auto-monitor-fetcher';

export async function syncAutoMonitorSite(site: MonitoredSite) {
  try {
    // 自动监控网站
    const metrics = await autoMonitorWebsite({
      url: site.url,
      checkSSL: true,
      checkSEO: true,
    });
    
    // 保存到数据库
    await db.update(monitoredSites)
      .set({
        lastSnapshot: metrics,
        lastSyncAt: new Date(),
        status: metrics.isOnline ? 'online' : 'offline',
      })
      .where(eq(monitoredSites.id, site.id));
    
    // 检查告警规则
    await checkAlertRules(site, metrics);
    
    console.log(`✅ Auto monitor completed for ${site.url}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Auto monitor failed for ${site.url}:`, error);
    return { success: false, error };
  }
}
```

---

## 📊 使用场景

### 1. 个人网站监控
- 博客
- 作品集
- 个人品牌网站

### 2. 客户网站监控
- 为客户提供监控服务
- 自动生成报告
- 及时发现问题

### 3. 竞争对手分析
- 监控竞品网站
- 技术栈分析
- 性能对比

### 4. SEO 优化
- 实时 SEO 分数
- 优化建议
- 排名追踪

---

## 🎯 优势对比

### vs 传统监控工具

| 功能 | SoloBoard 自动监控 | Pingdom | UptimeRobot |
|------|-------------------|---------|-------------|
| **配置难度** | ✅ 零配置 | ⚠️ 需配置 | ⚠️ 需配置 |
| **SEO 分析** | ✅ 内置 | ❌ 无 | ❌ 无 |
| **技术栈检测** | ✅ 自动 | ❌ 无 | ❌ 无 |
| **价格** | ✅ 免费 | 💰 $10/月起 | 💰 $7/月起 |
| **更新频率** | ✅ 15 分钟 | ⚠️ 1 分钟 | ⚠️ 5 分钟 |

---

## 🚀 高级功能（即将推出）

### 1. 关键词排名追踪
```typescript
{
  "keywords": ["SaaS", "监控工具", "网站分析"],
  "searchEngine": "google",
  "region": "zh-CN"
}
```

### 2. 页面截图
自动截取网站首页截图，记录视觉变化

### 3. 内容变化检测
监控页面内容变化，及时发现更新

### 4. 竞品对比
并排对比多个网站的性能和 SEO

---

## 📝 测试清单

- [ ] 输入网址后立即开始监控
- [ ] 正确显示网站状态（在线/离线）
- [ ] 响应时间准确
- [ ] SSL 状态正确
- [ ] SEO 分数计算准确
- [ ] 技术栈检测正常
- [ ] 每 15 分钟自动更新
- [ ] 告警规则触发正常
- [ ] Dashboard 显示美观

---

## 💡 最佳实践

### 1. 选择合适的监控频率
- 关键业务网站: 每 5 分钟
- 一般网站: 每 15 分钟
- 静态网站: 每小时

### 2. 设置合理的告警阈值
- 响应时间: > 3 秒
- 离线时间: > 5 分钟
- SEO 分数: < 60

### 3. 定期查看报告
- 每周查看性能趋势
- 每月生成 SEO 报告
- 及时处理告警

---

**🎊 恭喜！现在客户只需输入网址，就能自动监控网站的所有关键指标！**

**零配置 • 零成本 • 实时监控**






















