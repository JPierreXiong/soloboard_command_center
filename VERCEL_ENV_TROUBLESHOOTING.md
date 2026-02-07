# Vercel 环境变量排查指南

## 问题症状

- `supabaseUrl is required` 错误
- API 路由返回 401 未授权错误
- `/api/digital-heirloom/vault/get` 和 `/api/digital-heirloom/assets/list` 失败

## 快速排查步骤

### 1. 检查环境变量是否已设置

在 Vercel Dashboard 中：
1. 进入项目 -> **Settings** -> **Environment Variables**
2. 确认以下变量已设置：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `NEXT_PUBLIC_APP_URL`
   - `AUTH_URL`

### 2. 检查环境变量作用域

**重要**：确保所有 `NEXT_PUBLIC_*` 变量已勾选：
- ✅ Production
- ✅ Preview  
- ✅ Development

如果只勾选了 Development，生产环境将无法读取！

### 3. 重新部署（必须）

环境变量是在**构建时**注入的，更新变量后必须重新部署：

1. 前往 **Deployments** 页面
2. 点击最新的部署
3. 点击右上角 **⋯** 菜单
4. 选择 **Redeploy**
5. **不要勾选** "Use existing Build Cache"

### 4. 验证环境变量格式

确保变量值：
- ✅ 没有多余的空格或换行
- ✅ `NEXT_PUBLIC_SUPABASE_URL` 以 `https://` 开头
- ✅ `NEXT_PUBLIC_SUPABASE_URL` 包含 `.supabase.co`
- ✅ `AUTH_SECRET` 长度至少 32 字符

### 5. 检查浏览器控制台

打开浏览器开发者工具（F12），查看：
- Console 标签：是否有 `supabaseUrl is required` 错误
- Network 标签：API 请求的状态码和响应

## 常见问题

### Q: 环境变量已设置，但仍报错 `supabaseUrl is required`

**A:** 可能的原因：
1. 变量名拼写错误（注意大小写）
2. 变量未勾选 Production 环境
3. 未重新部署项目
4. 变量值包含特殊字符或空格

**解决方案**：
```bash
# 在本地运行检查脚本
pnpm tsx scripts/check-env-vars.ts
```

### Q: API 返回 401 未授权错误

**A:** 可能的原因：
1. 用户未登录（最常见）
2. Session Cookie 过期
3. `AUTH_SECRET` 配置错误
4. 认证中间件问题

**解决方案**：
1. 确认用户已登录
2. 清除浏览器 Cookie 后重新登录
3. 检查 `AUTH_SECRET` 是否正确设置

### Q: 如何确认环境变量已生效？

**A:** 在代码中添加临时日志（仅用于调试）：

```typescript
// 仅在开发环境使用
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20));
}
```

## 代码修复

我们已经添加了环境变量验证：

### 客户端组件（`asset-uploader.tsx`）
- ✅ 添加了 `getSupabaseConfig()` 函数
- ✅ 验证环境变量是否存在
- ✅ 提供清晰的错误信息

### 服务端工具（`storage-utils.ts`, `streaming-crypto-helper.ts`）
- ✅ 添加了环境变量验证
- ✅ 统一的错误处理

## 验证清单

部署前检查：

- [ ] 所有必需环境变量已设置
- [ ] 环境变量已勾选 Production/Preview/Development
- [ ] 变量值格式正确（无多余空格）
- [ ] 已执行重新部署（Redeploy）
- [ ] 浏览器控制台无错误
- [ ] 用户已登录（针对 401 错误）

## 获取帮助

如果问题仍然存在：

1. 运行环境变量检查脚本：
   ```bash
   pnpm tsx scripts/check-env-vars.ts
   ```

2. 检查 Vercel 构建日志：
   - 前往 Deployments -> 点击失败的部署 -> 查看 Build Logs

3. 检查浏览器控制台：
   - 打开开发者工具（F12）
   - 查看 Console 和 Network 标签

4. 提供以下信息：
   - Vercel 项目名称
   - 错误截图
   - 浏览器控制台输出
   - 环境变量检查脚本输出（隐藏敏感信息）
