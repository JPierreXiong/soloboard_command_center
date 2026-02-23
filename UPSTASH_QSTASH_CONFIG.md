# 🚀 Upstash QStash 配置步骤

**账号信息:**
- Username: XJP_product
- API Key: 08976337-b4a3-48c8-99b1-e6c1ba91f92b
- Console: https://console.upstash.com/

---

## 步骤 1: 进入 QStash 控制台

1. 访问 https://console.upstash.com/
2. 登录您的账号（XJP_product）
3. 在左侧菜单点击 **"QStash"**
4. 如果是第一次使用，点击 **"Get Started"**

---

## 步骤 2: 创建 Schedule（定时任务）

### 2.1 点击 "Schedules" 标签
在 QStash 页面顶部，找到并点击 **"Schedules"** 标签

### 2.2 点击 "Create Schedule" 按钮
点击右上角的 **"Create Schedule"** 或 **"New Schedule"** 按钮

---

## 步骤 3: 填写配置信息

### 基本信息

**Schedule Name:**
```
SoloBoard Data Sync
```

**Description (可选):**
```
Sync all monitored sites data every 15 minutes
```

---

### 请求配置

**Destination URL:**
```
https://your-vercel-domain.vercel.app/api/cron/sync-sites
```

⚠️ **重要:** 请将 `your-vercel-domain` 替换为您的实际 Vercel 域名

**如何找到您的 Vercel 域名:**
1. 访问 https://vercel.com/dashboard
2. 找到您的 SoloBoard 项目
3. 复制项目的 URL（例如：`soloboard-xyz.vercel.app`）

**HTTP Method:**
```
GET
```

---

### Headers 配置（重要！）

点击 **"Add Header"** 按钮，添加以下 Header：

**Header Name:**
```
Authorization
```

**Header Value:**
```
Bearer lHyTB7k7gxkcrWbWFSoNZk9IKy6d1ETWRrUOv3tcQGg=
```

⚠️ **安全提示:** 这个 Bearer Token 必须与您的 `.env.local` 和 Vercel 环境变量中的 `CRON_SECRET` 一致

---

### Schedule 配置

**Cron Expression:**
```
*/15 * * * *
```

**说明:** 每 15 分钟执行一次

**其他常用频率:**
- 每 5 分钟: `*/5 * * * *`
- 每 10 分钟: `*/10 * * * *`
- 每 30 分钟: `*/30 * * * *`
- 每小时: `0 * * * *`

**Timezone:**
```
UTC
```

---

### 高级配置（可选但推荐）

**Retry Configuration:**
- Max Retries: `3`
- Retry Delay: `60` seconds

**Timeout:**
- Request Timeout: `300` seconds (5 分钟)

**Callback URL (可选):**
留空即可

---

## 步骤 4: 保存并测试

### 4.1 保存配置
点击页面底部的 **"Create"** 或 **"Save"** 按钮

### 4.2 手动测试
1. 在 Schedules 列表中找到刚创建的 **"SoloBoard Data Sync"**
2. 点击任务名称进入详情页
3. 点击 **"Test"** 或 **"Run Now"** 按钮
4. 等待 5-10 秒查看结果

---

## 步骤 5: 验证结果

### 预期成功响应

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "success": true,
  "message": "Site data sync completed",
  "result": {
    "total": 5,
    "success": 5,
    "failed": 0,
    "duration": 2345
  },
  "timestamp": "2026-02-07T10:30:00.000Z"
}
```

### 如果看到这个响应，说明配置成功！✅

---

## 步骤 6: 查看执行日志

### 6.1 进入 Logs 页面
在 QStash 控制台，点击 **"Logs"** 标签

### 6.2 查看最近的执行记录
- 查看 Status（应该是 `200` 或 `Success`）
- 查看 Duration（执行时间）
- 查看 Response（返回的 JSON）

### 6.3 监控关键指标
- **Success Rate:** 应该接近 100%
- **Average Duration:** 通常在 2-5 秒
- **Error Count:** 应该为 0

---

## 🔧 故障排查

### 问题 1: 401 Unauthorized

**可能原因:**
- Authorization Header 配置错误
- CRON_SECRET 不匹配

**解决方案:**
1. 检查 Upstash Headers 中的 Bearer Token
2. 确认 Vercel 环境变量中的 `CRON_SECRET`
3. 确保两者完全一致（包括 `Bearer ` 前缀）

**验证命令:**
```bash
# 在本地测试
curl -X GET "https://your-domain.vercel.app/api/cron/sync-sites" \
  -H "Authorization: Bearer lHyTB7k7gxkcrWbWFSoNZk9IKy6d1ETWRrUOv3tcQGg="
```

---

### 问题 2: 404 Not Found

**可能原因:**
- Destination URL 错误
- API 路由不存在

**解决方案:**
1. 确认 URL 格式正确：`https://域名/api/cron/sync-sites`
2. 确认代码已部署到 Vercel
3. 手动访问 URL 测试

---

### 问题 3: 504 Gateway Timeout

**可能原因:**
- 同步时间过长（超过 300 秒）
- 数据库连接问题

**解决方案:**
1. 检查 Vercel 函数日志
2. 优化同步逻辑
3. 增加 Timeout 时间（最大 300 秒）

---

### 问题 4: 500 Internal Server Error

**可能原因:**
- 代码错误
- 数据库连接失败
- 环境变量缺失

**解决方案:**
1. 查看 Vercel 日志：`vercel logs`
2. 检查所有环境变量是否配置
3. 检查数据库连接字符串

---

## 📊 监控数据库

### 查看同步日志

```sql
-- 查看最近 10 次同步
SELECT 
  id,
  status,
  duration,
  sites_synced,
  created_at
FROM sync_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### 查看站点更新时间

```sql
-- 查看所有站点的最后同步时间
SELECT 
  id,
  name,
  platform,
  last_sync_at,
  (last_snapshot->>'updatedAt') as snapshot_time
FROM monitored_sites
ORDER BY last_sync_at DESC;
```

### 验证数据新鲜度

```sql
-- 查看数据是否在 15 分钟内
SELECT 
  name,
  last_sync_at,
  EXTRACT(EPOCH FROM (NOW() - last_sync_at))/60 as minutes_ago
FROM monitored_sites
WHERE last_sync_at IS NOT NULL
ORDER BY last_sync_at DESC;
```

**预期结果:** `minutes_ago` 应该小于 15

---

## 🎯 完整配置清单

### Upstash QStash 配置

- [ ] 账号已登录（XJP_product）
- [ ] 进入 QStash 控制台
- [ ] 创建 Schedule
- [ ] 填写 Name: `SoloBoard Data Sync`
- [ ] 填写 URL: `https://your-domain.vercel.app/api/cron/sync-sites`
- [ ] 选择 Method: `GET`
- [ ] 添加 Header: `Authorization: Bearer lHyTB7k7gxkcrWbWFSoNZk9IKy6d1ETWRrUOv3tcQGg=`
- [ ] 设置 Cron: `*/15 * * * *`
- [ ] 设置 Timezone: `UTC`
- [ ] 设置 Retry: `3 次`
- [ ] 设置 Timeout: `300 秒`
- [ ] 保存配置
- [ ] 手动测试成功（200 OK）
- [ ] 查看 Logs 确认执行

### Vercel 配置

- [ ] 确认 `CRON_SECRET` 环境变量已配置
- [ ] 确认代码已部署
- [ ] 确认 API 路由可访问
- [ ] 查看函数日志无错误

### 数据库验证

- [ ] sync_logs 表有新记录
- [ ] monitored_sites 的 last_sync_at 已更新
- [ ] 数据新鲜度在 15 分钟内

---

## 🎉 配置完成后

### 等待 15 分钟

配置完成后，等待 15 分钟，然后检查：

1. **Upstash Logs**
   - 进入 QStash → Logs
   - 查看是否有自动执行记录
   - 确认状态为 Success

2. **Vercel Logs**
   ```bash
   vercel logs --follow
   ```
   - 查看是否有 `/api/cron/sync-sites` 的请求
   - 确认返回 200 OK

3. **数据库**
   ```sql
   SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 1;
   ```
   - 确认有新的同步记录
   - 确认时间在最近 15 分钟内

---

## 📞 需要帮助？

### 文档
- Upstash QStash 文档: https://upstash.com/docs/qstash
- Vercel Cron 文档: https://vercel.com/docs/cron-jobs

### 支持
- Upstash Discord: https://discord.gg/upstash
- Upstash Support: support@upstash.com

### 本地测试
```bash
# 测试 API 端点
curl -X GET "http://localhost:3000/api/cron/sync-sites" \
  -H "Authorization: Bearer lHyTB7k7gxkcrWbWFSoNZk9IKy6d1ETWRrUOv3tcQGg="

# 查看 Vercel 日志
vercel logs

# 查看数据库
npm run db:studio
```

---

## 🚀 下一步

配置完成并验证成功后：

1. ✅ 提交代码到 Git
2. ✅ 更新 Landing Page（添加 "Real-Time Monitoring" 卖点）
3. ✅ 翻译新内容到中文和法语
4. ✅ 监控系统运行 24 小时
5. ✅ 收集用户反馈

---

**祝配置顺利！如有问题随时联系。** 🎉




















