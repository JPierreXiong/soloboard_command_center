# SoloBoard - 多站点监控仪表盘

**一屏看透 10 个站，把时间还给咖啡 ☕**

基于 ShipAny SaaS 框架构建的多站点监控系统，专为一人公司创业者设计。

---

## 🎯 核心功能

### 已实现（Phase 1 - 数据底座）

✅ **数据库 Schema 设计**
- `monitored_sites` - 监控站点表（加密存储 API 配置）
- `site_metrics_history` - 站点指标历史表
- `sync_logs` - 同步任务日志表

✅ **加密安全系统**
- AES-256-CBC 加密算法
- 用户 API Key 加密存储
- 环境变量密钥管理

✅ **平台集成服务**
- Google Analytics 4 - 实时在线人数、页面浏览量
- Stripe - 今日销售额、交易数
- Uptime 监控 - 网站在线状态、响应时间

✅ **API 路由**
- `POST /api/soloboard/sites/add` - 添加新站点
- `GET /api/soloboard/sites` - 获取用户站点列表
- `GET /api/cron/sync-sites` - 定时数据同步

✅ **数据同步服务**
- 统一的数据抓取调度器
- 并行同步多个站点
- 错误处理和日志记录

---

## 🏗️ 技术架构

### 核心技术栈
- **框架**: Next.js 16.1.0 + React 19
- **数据库**: Neon Postgres (Serverless)
- **ORM**: Drizzle ORM
- **认证**: Better Auth
- **支付**: Creem (全球收款)
- **部署**: Vercel
- **UI**: Tailwind CSS + shadcn/ui

### 安全设计
```
用户输入 API Key
    ↓
AES-256-CBC 加密
    ↓
存入 Neon 数据库（密文）
    ↓
Cron Job 读取并解密
    ↓
调用第三方 API
    ↓
缓存到 lastSnapshot（明文指标）
    ↓
前端读取快照（秒开）
```

---

## 📦 安装和配置

### 1. 安装依赖

```bash
pnpm install
```

### 2. 添加必要的 npm 包

```bash
# Google Analytics Data API
pnpm add @google-analytics/data

# Stripe SDK（已安装）
# pnpm add stripe
```

### 3. 配置环境变量

复制 `env.example.txt` 为 `.env.local`：

```bash
cp env.example.txt .env.local
```

**必需的环境变量：**

```env
# 数据库
DATABASE_URL=postgresql://user:password@host:5432/soloboard

# 认证
AUTH_SECRET=your-auth-secret-key-here

# 应用 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ⭐ SoloBoard 核心：加密密钥（32 字节）
ENCRYPTION_KEY=your-32-byte-encryption-key-here

# Cron Job 密钥（可选，用于保护 Cron 端点）
CRON_SECRET=your-cron-secret-key-here
```

**生成加密密钥：**

```bash
# macOS/Linux
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 4. 数据库迁移

```bash
# 生成迁移文件
pnpm db:generate

# 推送到数据库
pnpm db:push
```

### 5. 启动开发服务器

```bash
pnpm dev
```

---

## 🔐 安全最佳实践

### 1. 加密密钥管理

- ✅ `ENCRYPTION_KEY` 必须是 32 字节（256 位）
- ✅ 使用 `openssl rand -base64 32` 生成
- ✅ 不要提交到 Git
- ✅ 生产环境使用不同的密钥

### 2. API 配置存储

```typescript
// ✅ 正确：加密后存储
const encrypted = encryptSiteConfigObject({
  stripe: {
    secretKey: 'sk_live_xxx',
  },
});

await db.insert(monitoredSites).values({
  encryptedConfig: encrypted, // 存储密文
});

// ❌ 错误：明文存储
await db.insert(monitoredSites).values({
  apiKey: 'sk_live_xxx', // 不要这样做！
});
```

### 3. 数据库安全

- ✅ 用户只能访问自己的站点
- ✅ API 路由验证用户身份
- ✅ 不返回加密的配置给前端

---

## 📊 数据库 Schema

### monitored_sites（监控站点表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | text | 主键 |
| `userId` | text | 用户 ID（外键） |
| `name` | text | 站点名称 |
| `url` | text | 站点地址 |
| `platform` | text | 平台类型（GA4, STRIPE, UPTIME） |
| `encryptedConfig` | text | **加密的 API 配置** |
| `lastSnapshot` | jsonb | 最后一次数据快照 |
| `status` | text | 状态（active, error, paused） |
| `healthStatus` | text | 健康状态（online, offline） |
| `lastSyncAt` | timestamp | 最后同步时间 |

### site_metrics_history（指标历史表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | text | 主键 |
| `siteId` | text | 站点 ID（外键） |
| `metrics` | jsonb | 指标数据 |
| `recordedAt` | timestamp | 记录时间 |

### sync_logs（同步日志表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | text | 主键 |
| `siteId` | text | 站点 ID（外键） |
| `status` | text | 状态（success, failed） |
| `duration` | integer | 执行时长（毫秒） |
| `errorMessage` | text | 错误信息 |

---

## 🚀 API 使用示例

### 1. 添加 Google Analytics 站点

```typescript
const response = await fetch('/api/soloboard/sites/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: '我的 AI 工具',
    url: 'https://myaitool.com',
    platform: 'GA4',
    config: {
      ga4: {
        propertyId: '123456789',
        credentials: JSON.stringify({
          type: 'service_account',
          project_id: 'my-project',
          private_key_id: 'xxx',
          private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
          client_email: 'xxx@xxx.iam.gserviceaccount.com',
          client_id: 'xxx',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
        }),
      },
    },
  }),
});

const result = await response.json();
console.log(result); // { success: true, siteId: 'xxx' }
```

### 2. 添加 Stripe 站点

```typescript
const response = await fetch('/api/soloboard/sites/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: '我的 SaaS 产品',
    url: 'https://mysaas.com',
    platform: 'STRIPE',
    config: {
      stripe: {
        secretKey: 'sk_live_xxx',
        publishableKey: 'pk_live_xxx',
      },
    },
  }),
});
```

### 3. 获取所有站点

```typescript
const response = await fetch('/api/soloboard/sites');
const data = await response.json();

console.log(data.sites);
// [
//   {
//     id: 'xxx',
//     name: '我的 AI 工具',
//     platform: 'GA4',
//     lastSnapshot: {
//       metrics: {
//         activeUsers: 42,
//         pageViews: 1234,
//         sessions: 567,
//       },
//       updatedAt: '2026-02-06T12:00:00Z',
//     },
//   },
// ]
```

---

## 🔄 Cron Job 配置

在 `vercel.json` 中配置定时任务：

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-sites",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**说明：**
- `*/15 * * * *` - 每 15 分钟执行一次
- Vercel 会自动添加 `x-vercel-cron: 1` header
- 也可以手动调用（需要 `CRON_SECRET`）

---

## 📝 下一步开发计划

### Phase 2: 前端 Dashboard UI
- [ ] 九宫格监控面板
- [ ] 实时数据刷新
- [ ] 站点添加表单
- [ ] 趋势图表（Recharts）

### Phase 3: 更多平台集成
- [ ] Lemon Squeezy
- [ ] Shopify
- [ ] PayPal
- [ ] Cloudflare Analytics

### Phase 4: 高级功能
- [ ] AI 智能周报（每日摘要）
- [ ] 异常报警（邮件/Telegram）
- [ ] 自定义指标
- [ ] 团队协作

### Phase 5: 订阅计划
- [ ] 免费版：2 个站点
- [ ] Pro 版：10 个站点 + AI 周报
- [ ] Studio 版：无限站点 + 团队协作

---

## 🎨 设计理念

### 核心原则
1. **不破坏 ShipAny 结构** - 所有代码遵循 ShipAny 的目录规范
2. **安全第一** - 用户 API Key 加密存储
3. **性能优先** - 后台同步 + 快照缓存，前端秒开
4. **简单易用** - 一键添加站点，自动验证配置

### 文件组织
```
src/
├── app/api/soloboard/          # SoloBoard API 路由
│   └── sites/
│       ├── add/route.ts        # 添加站点
│       └── route.ts            # 获取站点列表
├── app/api/cron/               # Cron Jobs
│   └── sync-sites/route.ts     # 数据同步
├── config/db/
│   └── schema.ts               # 数据库 Schema（新增 3 张表）
└── shared/
    ├── lib/
    │   └── site-crypto.ts      # 加密工具
    └── services/soloboard/     # 平台集成服务
        ├── ga4-fetcher.ts      # Google Analytics
        ├── stripe-fetcher.ts   # Stripe
        ├── uptime-fetcher.ts   # Uptime 监控
        └── sync-service.ts     # 同步调度器
```

---

## 🐛 故障排查

### 1. 加密错误

```
Error: ENCRYPTION_KEY is not set in environment variables
```

**解决方案：**
- 确保 `.env.local` 中配置了 `ENCRYPTION_KEY`
- 使用 `openssl rand -base64 32` 生成

### 2. GA4 认证失败

```
Error: Failed to fetch GA4 metrics: invalid_grant
```

**解决方案：**
- 检查 Service Account JSON 是否正确
- 确保 Service Account 有 GA4 Property 的读取权限
- 在 GA4 中添加 Service Account 邮箱为查看者

### 3. Stripe API 错误

```
Error: Invalid API Key provided
```

**解决方案：**
- 检查 Stripe Secret Key 是否正确
- 确保使用 `sk_live_` 或 `sk_test_` 开头的密钥

---

## 📄 许可证

基于 ShipAny 框架构建，遵循 ShipAny LICENSE。

⚠️ **请勿公开发布 ShipAny 的代码。非法使用将被追究责任。**

---

## 🙏 致谢

- **ShipAny** - 提供强大的 SaaS 框架
- **Neon** - Serverless PostgreSQL 数据库
- **Vercel** - 部署和 Cron Jobs
- **Creem** - 全球支付解决方案

---

**构建时间**: 2026-02-06  
**版本**: v0.1.0 (Phase 1 - 数据底座完成)  
**核心原则**: ✅ **不改变 ShipAny 结构**





















