# 🚀 SoloBoard 快速参考卡片

> 一页纸快速查阅所有关键信息

---

## 📦 快速启动（3 步）

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填写必需配置

# 3. 启动服务
npm run db:push && npm run dev
```

访问: http://localhost:3002

---

## 🔑 必需环境变量

```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=your-secret
ENCRYPTION_KEY=your-encryption-key
CRON_SECRET=your-cron-secret
OPENAI_API_KEY=sk-proj-xxx        # AI 周报
RESEND_API_KEY=re_xxx              # 邮件通知
```

---

## 📡 API 端点速查

### 站点管理
```bash
POST   /api/soloboard/sites/add              # 添加站点
GET    /api/soloboard/sites                  # 获取列表
DELETE /api/soloboard/sites/[id]             # 删除站点
GET    /api/soloboard/sites/[id]/history     # 历史数据
```

### 报警系统
```bash
POST   /api/soloboard/alerts/rules           # 创建规则
GET    /api/soloboard/alerts/history         # 报警历史
```

### AI 报告
```bash
POST   /api/soloboard/reports/generate       # 生成报告
GET    /api/soloboard/reports                # 报告列表
```

### 团队协作
```bash
POST   /api/soloboard/teams                  # 创建团队
POST   /api/soloboard/teams/[id]/invite      # 邀请成员
POST   /api/soloboard/teams/[id]/share       # 共享站点
```

### 自定义 API
```bash
POST   /api/soloboard/custom-api/test        # 测试配置
POST   /api/soloboard/custom-api/add         # 添加站点
```

### Cron Jobs
```bash
GET    /api/cron/sync-sites                  # 同步数据（每 10 分钟）
GET    /api/cron/check-alerts                # 检查报警（每 5 分钟）
```

---

## 🎨 支持的平台

| 平台 | 配置字段 | 主要指标 |
|------|----------|----------|
| **GA4** | `propertyId`, `credentials` | 活跃用户、浏览量、会话 |
| **Stripe** | `apiKey` | 收入、交易数、客户数 |
| **Lemon Squeezy** | `apiKey`, `storeId` | 销售额、订单、MRR |
| **Shopify** | `shopDomain`, `accessToken` | 销售额、订单、库存 |
| **Uptime** | `url` | 响应时间、在线状态 |
| **Custom API** | `url`, `auth`, `metrics` | 自定义指标 |

---

## 🔔 报警类型

| 类型 | 阈值配置 | 示例 |
|------|----------|------|
| `downtime` | `downtime: 60` | 宕机超过 60 秒 |
| `slow_response` | `responseTime: 3000` | 响应超过 3000ms |
| `revenue_drop` | `revenueDropPercent: 30` | 收入下降 30% |
| `traffic_spike` | `trafficSpikePercent: 200` | 流量激增 200% |

**通知渠道**: `email`, `telegram`, `webhook`

---

## 👥 团队角色权限

| 角色 | 添加 | 编辑 | 删除 | 管理成员 | 查看报告 |
|------|------|------|------|----------|----------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ❌ | ❌ | ✅ |
| Viewer | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🗄️ 数据库表

### Phase 1 & 2
- `monitored_sites` - 监控站点
- `site_metrics_history` - 指标历史
- `sync_logs` - 同步日志

### Phase 3
- `alert_rules` - 报警规则
- `alert_history` - 报警历史
- `teams` - 团队
- `team_members` - 团队成员
- `team_sites` - 团队站点
- `ai_reports` - AI 报告

---

## 🔐 加密配置示例

```typescript
// 添加站点时的配置格式
{
  ga4: {
    propertyId: "123456789",
    credentials: { /* service account */ }
  },
  stripe: {
    apiKey: "sk_test_xxx"
  },
  lemonSqueezy: {
    apiKey: "xxx",
    storeId: "12345"
  },
  shopify: {
    shopDomain: "shop.myshopify.com",
    accessToken: "shpat_xxx"
  },
  uptime: {
    url: "https://example.com"
  },
  customApi: {
    url: "https://api.example.com/metrics",
    method: "GET",
    auth: {
      type: "bearer",
      token: "xxx"
    },
    metrics: [
      {
        name: "revenue",
        label: "收入",
        jsonPath: "data.revenue",
        type: "number",
        format: "currency"
      }
    ]
  }
}
```

---

## 📊 AI 报告示例

```typescript
// 生成周报
await fetch('/api/soloboard/reports/generate', {
  method: 'POST',
  body: JSON.stringify({
    reportType: 'weekly',  // 'daily' | 'weekly' | 'monthly'
    sendEmail: true
  })
});

// 报告内容
{
  summary: "在过去 7 天中，您的 5 个站点总收入为 $12,345...",
  insights: [
    "Site A 收入增长 45%，表现优异",
    "Site B 流量激增 120%",
    "Site C 响应时间较慢（2500ms）"
  ],
  recommendations: [
    "优化 Site C 的页面加载速度",
    "检查 Site B 的服务器性能",
    "继续保持 Site A 的运营策略"
  ]
}
```

---

## 🧪 测试命令

```bash
# 测试数据同步
curl http://localhost:3002/api/cron/sync-sites \
  -H "Authorization: Bearer your-cron-secret"

# 测试报警检查
curl http://localhost:3002/api/cron/check-alerts \
  -H "Authorization: Bearer your-cron-secret"

# 测试自定义 API
curl -X POST http://localhost:3002/api/soloboard/custom-api/test \
  -H "Content-Type: application/json" \
  -d '{"config": {...}}'
```

---

## 📁 项目结构速查

```
soloboard/
├── app/api/soloboard/          # API 路由
│   ├── sites/                  # 站点管理
│   ├── alerts/                 # 报警系统
│   ├── reports/                # AI 报告
│   ├── teams/                  # 团队协作
│   └── custom-api/             # 自定义 API
├── src/
│   ├── components/soloboard/   # React 组件
│   ├── services/soloboard/     # 业务服务
│   │   ├── platform-fetchers/  # 平台集成
│   │   ├── alert-service.ts    # 报警服务
│   │   ├── ai-report-service.ts # AI 报告
│   │   ├── team-service.ts     # 团队协作
│   │   └── custom-api-service.ts # 自定义 API
│   └── config/db/schema.ts     # 数据库 Schema
└── migrations/                 # 数据库迁移
```

---

## 🚀 部署命令

```bash
# 本地开发
npm run dev

# 构建生产版本
npm run build

# 启动生产服务
npm start

# 数据库迁移
npm run db:generate
npm run db:push

# Vercel 部署
vercel --prod
```

---

## 📚 文档速查

| 文档 | 用途 |
|------|------|
| `README_SOLOBOARD.md` | 项目主文档 |
| `GET_STARTED.md` | 快速开始 |
| `PHASE3_QUICKSTART.md` | Phase 3 快速启动 |
| `PHASE3_COMPLETE.md` | 功能详解 |
| `PHASE3_CHECKLIST.md` | 开发清单 |
| `PHASE3_SUMMARY.md` | 项目总结 |

---

## 🐛 常见问题

### Q: OpenAI API 调用失败？
**A**: 检查 `OPENAI_API_KEY`，或使用降级方案（自动启用）

### Q: 邮件通知未发送？
**A**: 确认 `RESEND_API_KEY` 和发件域名已验证

### Q: Cron Job 未执行？
**A**: 检查 `CRON_SECRET`，Vercel 需在项目设置中配置

### Q: 数据同步失败？
**A**: 查看 `sync_logs` 表的错误信息

### Q: 团队成员无法访问？
**A**: 确认成员已加入团队且站点已共享

---

## 📞 获取帮助

- **完整文档**: 查看项目根目录的 Markdown 文件
- **API 测试**: 使用 Postman 或 curl
- **数据库查询**: 使用 Drizzle Studio (`npm run db:studio`)
- **日志查看**: 检查控制台输出和数据库日志表

---

## ✅ 快速检查清单

开发环境：
- [ ] Node.js 18+ 已安装
- [ ] PostgreSQL 数据库已创建
- [ ] 环境变量已配置
- [ ] 依赖已安装
- [ ] 数据库已迁移
- [ ] 开发服务器可启动

功能测试：
- [ ] 至少添加 1 个站点
- [ ] 数据同步成功
- [ ] 仪表板显示正常
- [ ] 趋势图表可查看

---

**版本**: Phase 3.0.0  
**状态**: ✅ 生产就绪  
**更新**: 2026-02-06

---

💡 **提示**: 将此文件打印或保存为 PDF，作为日常开发参考！























