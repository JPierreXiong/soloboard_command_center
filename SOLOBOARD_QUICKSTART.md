# SoloBoard - 快速开始指南

**5 分钟完成 SoloBoard 数据底座的配置和测试**

---

## ✅ Phase 1 完成清单

我们已经完成了 SoloBoard 的核心数据底座：

### 📦 已创建的文件

#### 1. 数据库 Schema
- ✅ `src/config/db/schema.ts` - 新增 3 张表
  - `monitored_sites` - 监控站点表
  - `site_metrics_history` - 指标历史表
  - `sync_logs` - 同步日志表

#### 2. 加密工具
- ✅ `src/shared/lib/site-crypto.ts` - AES-256-CBC 加密/解密

#### 3. 平台集成服务
- ✅ `src/shared/services/soloboard/ga4-fetcher.ts` - Google Analytics 4
- ✅ `src/shared/services/soloboard/stripe-fetcher.ts` - Stripe
- ✅ `src/shared/services/soloboard/uptime-fetcher.ts` - Uptime 监控
- ✅ `src/shared/services/soloboard/sync-service.ts` - 数据同步调度器

#### 4. API 路由
- ✅ `src/app/api/soloboard/sites/add/route.ts` - 添加站点
- ✅ `src/app/api/soloboard/sites/route.ts` - 获取站点列表
- ✅ `src/app/api/cron/sync-sites/route.ts` - 定时同步

#### 5. 配置文件
- ✅ `env.example.txt` - 更新环境变量模板
- ✅ `package.json` - 添加 Google Analytics Data API 依赖

---

## 🚀 下一步操作

### 1. 安装依赖

```bash
cd D:\AIsoftware\soloboard
pnpm install
```

这会安装新添加的 `@google-analytics/data` 包。

### 2. 生成加密密钥

**Windows PowerShell:**
```powershell
# 生成 ENCRYPTION_KEY
$bytes = New-Object byte[] 32
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# 生成 AUTH_SECRET
$bytes = New-Object byte[] 32
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# 生成 CRON_SECRET
$bytes = New-Object byte[] 32
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**macOS/Linux:**
```bash
# 生成 ENCRYPTION_KEY
openssl rand -base64 32

# 生成 AUTH_SECRET
openssl rand -base64 32

# 生成 CRON_SECRET
openssl rand -base64 32
```

### 3. 创建 .env.local 文件

复制 `env.example.txt` 并填写必需的环境变量：

```bash
cp env.example.txt .env.local
```

**最小配置（必需）：**

```env
# 应用 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 数据库（从 Digital Heirloom 复制）
DATABASE_URL=postgresql://user:password@host:5432/soloboard

# 认证密钥（生成新的）
AUTH_SECRET=your-generated-auth-secret-here

# ⭐ SoloBoard 加密密钥（生成新的）
ENCRYPTION_KEY=your-generated-encryption-key-here

# Cron Job 密钥（可选）
CRON_SECRET=your-generated-cron-secret-here

# 存储（从 Digital Heirloom 复制）
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
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

访问 http://localhost:3000

---

## 🧪 测试 API

### 测试 1: 添加 Uptime 监控站点（最简单）

```bash
curl -X POST http://localhost:3000/api/soloboard/sites/add \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "name": "Google",
    "url": "https://www.google.com",
    "platform": "UPTIME",
    "config": {
      "uptime": {
        "url": "https://www.google.com"
      }
    }
  }'
```

**预期响应：**
```json
{
  "success": true,
  "message": "Site added successfully",
  "siteId": "xxx"
}
```

### 测试 2: 获取站点列表

```bash
curl http://localhost:3000/api/soloboard/sites \
  -H "Cookie: your-session-cookie"
```

**预期响应：**
```json
{
  "success": true,
  "sites": [
    {
      "id": "xxx",
      "name": "Google",
      "platform": "UPTIME",
      "lastSnapshot": {
        "metrics": {
          "isOnline": true,
          "responseTime": 123
        },
        "updatedAt": "2026-02-06T12:00:00Z"
      }
    }
  ],
  "total": 1
}
```

### 测试 3: 手动触发数据同步

```bash
curl http://localhost:3000/api/cron/sync-sites \
  -H "Authorization: Bearer your-cron-secret"
```

---

## 📊 验证数据库

使用 Drizzle Studio 查看数据：

```bash
pnpm db:studio
```

访问 https://local.drizzle.studio

检查以下表：
- ✅ `monitored_sites` - 应该有你添加的站点
- ✅ `site_metrics_history` - 应该有历史数据
- ✅ `sync_logs` - 应该有同步日志

---

## 🔐 安全检查清单

- [ ] `ENCRYPTION_KEY` 已生成并配置（32 字节）
- [ ] `AUTH_SECRET` 已生成并配置
- [ ] `.env.local` 已添加到 `.gitignore`
- [ ] 数据库中的 `encryptedConfig` 字段是密文
- [ ] API 路由验证用户身份
- [ ] Cron Job 端点有密钥保护

---

## 🎯 下一步开发

### Phase 2: 前端 Dashboard UI

创建九宫格监控面板：

```
src/app/[locale]/(dashboard)/soloboard/
├── page.tsx                    # 主仪表盘
└── _components/
    ├── site-grid.tsx           # 九宫格布局
    ├── site-card.tsx           # 单个站点卡片
    ├── add-site-dialog.tsx     # 添加站点对话框
    └── metrics-chart.tsx       # 趋势图表
```

### 关键功能
1. **实时刷新** - 使用 SWR 或 React Query
2. **九宫格布局** - 类似监控摄像头
3. **拖拽排序** - 使用 @dnd-kit
4. **趋势图表** - 使用 Recharts

---

## 🐛 常见问题

### Q1: 加密密钥错误

```
Error: ENCRYPTION_KEY must be 32 bytes
```

**解决：** 使用上面的命令重新生成 32 字节的密钥。

### Q2: 数据库连接失败

```
Error: connect ECONNREFUSED
```

**解决：** 检查 `DATABASE_URL` 是否正确，确保数据库正在运行。

### Q3: API 返回 401 Unauthorized

**解决：** 确保用户已登录，并且 Cookie 中有有效的 session。

---

## 📚 相关文档

- [SOLOBOARD_README.md](./SOLOBOARD_README.md) - 完整文档
- [SHIPANY_INTEGRATION_PRINCIPLE.md](./SHIPANY_INTEGRATION_PRINCIPLE.md) - 集成原则
- [env.example.txt](./env.example.txt) - 环境变量模板

---

**构建时间**: 2026-02-06  
**当前阶段**: Phase 1 完成 ✅  
**下一阶段**: Phase 2 - 前端 Dashboard UI





















