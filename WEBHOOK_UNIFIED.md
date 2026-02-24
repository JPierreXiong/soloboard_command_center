# 🔔 统一的 Creem Webhook 配置

## ✅ 已完成

现在 `/api/webhooks/creem` 端点可以智能处理两种类型的 webhook：

### 1️⃣ SoloBoard 自己的收款（用户购买订阅）
- 当用户支付 $19.90 购买 Base Plan 时
- Webhook 会自动创建订阅记录
- 更新用户的计划类型
- 更新订单状态为 "paid"

### 2️⃣ 用户 Creem 店铺的订单（监控功能）
- 监控用户自己的 Creem 店铺收入
- 用于 Dashboard 数据展示

## 🎯 工作原理

Webhook 通过检查 `metadata` 字段来判断类型：

```javascript
// SoloBoard 支付的特征：
metadata.app_name === 'Command Center'
metadata.userId 或 metadata.user_id 存在
metadata.orderId 或 metadata.order_no 存在

// 用户店铺订单的特征：
没有上述 metadata 字段
```

## 🔧 Creem 后台配置

### 在 Creem Dashboard 中：

1. 登录：https://www.creem.io/dashboard
2. 进入 Settings → Webhooks
3. 添加 Webhook URL：
   ```
   https://soloboard-command-center-b.vercel.app/api/webhooks/creem
   ```
4. 选择事件类型：
   - ✅ `checkout.session.completed`
   - ✅ `payment.succeeded`
   - ✅ `subscription.updated`
   - ✅ `subscription.canceled`

### 只需要配置一个 Webhook URL！

之前需要配置两个不同的 URL，现在只需要一个：
- ✅ `/api/webhooks/creem` - 处理所有类型

## 🧪 测试

### 测试 SoloBoard 支付：
1. 访问：https://soloboard-command-center-b.vercel.app/pricing
2. 点击 "Subscribe" 购买 Base Plan
3. 完成支付
4. Webhook 会自动：
   - 创建订阅
   - 更新用户计划
   - 显示在 Billing 页面

### 测试用户店铺监控：
1. 在用户的 Creem 店铺完成一笔订单
2. Webhook 会接收通知
3. 更新 Dashboard 数据

## 📊 日志查看

在 Vercel Dashboard 中查看日志：
1. 进入项目 → Deployments
2. 点击最新部署 → Runtime Logs
3. 搜索 `[Webhook]` 查看处理日志

日志示例：
```
🔔 [Webhook] Unified Creem webhook received
💰 [Webhook] Detected SoloBoard payment webhook
📦 [SoloBoardPayment] Processing CHECKOUT_SUCCESS event
✅ [CheckoutSuccess] Subscription created successfully
```

## 🔍 调试

如果支付后没有看到订阅：

1. **检查 Webhook 是否被调用**
   - 在 Creem Dashboard 查看 Webhook 日志
   - 在 Vercel Runtime Logs 查看

2. **检查环境变量**
   ```bash
   CREEM_API_KEY=<必需>
   CREEM_SIGNING_SECRET=<必需>
   CREEM_ENVIRONMENT=production
   ```

3. **使用修复工具**
   ```
   https://soloboard-command-center-b.vercel.app/fix-payment.html
   ```

## 🎉 优势

- ✅ 只需配置一个 Webhook URL
- ✅ 自动识别支付类型
- ✅ 支持游客支付（通过邮箱自动创建用户）
- ✅ 详细的日志记录
- ✅ 错误处理和重试机制

## 📝 注意事项

1. **Webhook 签名验证**
   - 使用 Creem SDK 自动验证签名
   - 确保 `CREEM_SIGNING_SECRET` 正确配置

2. **幂等性**
   - Webhook 可能被多次调用
   - 代码已处理重复订阅的情况

3. **游客支付**
   - 如果用户未登录就支付，系统会通过邮箱自动创建账户
   - 用户可以使用该邮箱登录查看订阅

## 🚀 下一步

1. 等待 Vercel 部署完成（约2-3分钟）
2. 在 Creem 后台配置 Webhook URL
3. 使用修复工具修复您的 $19.90 支付
4. 测试新的支付流程

