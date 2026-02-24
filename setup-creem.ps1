# Creem 支付快速配置脚本
# 使用方法: .\setup-creem.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Creem 支付配置向导" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 检查 .env.local 是否存在
$envFile = ".env.local"
$envExists = Test-Path $envFile

if ($envExists) {
    Write-Host "发现现有的 .env.local 文件" -ForegroundColor Yellow
    $backup = Read-Host "是否备份现有文件? (y/n)"
    if ($backup -eq "y") {
        $backupFile = ".env.local.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item $envFile $backupFile
        Write-Host "已备份到: $backupFile" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "请按照提示输入 Creem 配置信息" -ForegroundColor Cyan
Write-Host "提示: 从 https://creem.io/dashboard 获取" -ForegroundColor Gray
Write-Host ""

# 1. Creem API Key
Write-Host "1. Creem API Key" -ForegroundColor Yellow
Write-Host "   位置: Creem Dashboard -> Settings -> API Keys" -ForegroundColor Gray
$creemApiKey = Read-Host "   请输入 Creem API Key (creem_live_xxx 或 creem_test_xxx)"

# 2. Creem Environment
Write-Host ""
Write-Host "2. Creem 环境" -ForegroundColor Yellow
Write-Host "   选项: sandbox (测试) 或 production (生产)" -ForegroundColor Gray
$creemEnv = Read-Host "   请输入环境 (默认: production)"
if ([string]::IsNullOrWhiteSpace($creemEnv)) {
    $creemEnv = "production"
}

# 3. Creem Signing Secret
Write-Host ""
Write-Host "3. Creem Signing Secret" -ForegroundColor Yellow
Write-Host "   位置: Creem Dashboard -> Settings -> Webhooks" -ForegroundColor Gray
$creemSecret = Read-Host "   请输入 Signing Secret (whsec_xxx)"

# 4. 产品 ID
Write-Host ""
Write-Host "4. Creem 产品 ID" -ForegroundColor Yellow
Write-Host "   位置: Creem Dashboard -> Products" -ForegroundColor Gray
Write-Host "   提示: 需要先在 Creem Dashboard 创建产品" -ForegroundColor Gray
Write-Host ""

$freeProductId = Read-Host "   Free Plan 产品 ID (可选，按 Enter 跳过)"
$baseProductId = Read-Host "   Base Plan 产品 ID (可选，按 Enter 跳过)"
$proProductId = Read-Host "   Pro Plan 产品 ID (必需)"

# 5. 数据库配置
Write-Host ""
Write-Host "5. 数据库配置" -ForegroundColor Yellow
$databaseUrl = Read-Host "   请输入 DATABASE_URL (postgresql://...)"

# 6. 应用配置
Write-Host ""
Write-Host "6. 应用配置" -ForegroundColor Yellow
$appUrl = Read-Host "   请输入应用 URL (默认: http://localhost:3000)"
if ([string]::IsNullOrWhiteSpace($appUrl)) {
    $appUrl = "http://localhost:3000"
}

# 7. 生成密钥
Write-Host ""
Write-Host "7. 生成安全密钥" -ForegroundColor Yellow
Write-Host "   正在生成随机密钥..." -ForegroundColor Gray

function Generate-RandomKey {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

$authSecret = Generate-RandomKey
$encryptionKey = Generate-RandomKey

Write-Host "   ✓ AUTH_SECRET 已生成" -ForegroundColor Green
Write-Host "   ✓ ENCRYPTION_KEY 已生成" -ForegroundColor Green

# 构建产品 ID JSON
$productIds = @{}
if (![string]::IsNullOrWhiteSpace($freeProductId)) {
    $productIds["free-annual"] = $freeProductId
}
if (![string]::IsNullOrWhiteSpace($baseProductId)) {
    $productIds["base-annual"] = $baseProductId
}
if (![string]::IsNullOrWhiteSpace($proProductId)) {
    $productIds["pro-annual"] = $proProductId
}
$productIdsJson = $productIds | ConvertTo-Json -Compress

# 生成 .env.local 内容
$envContent = @"
# ============================================
# Creem 支付配置
# 生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# ============================================

# Creem 启用状态
CREEM_ENABLED=true

# Creem 环境
CREEM_ENVIRONMENT=$creemEnv

# Creem API Key
CREEM_API_KEY=$creemApiKey

# Creem Signing Secret
CREEM_SIGNING_SECRET=$creemSecret

# Creem 产品 ID 映射
CREEM_PRODUCT_IDS=$productIdsJson

# 默认支付提供商
DEFAULT_PAYMENT_PROVIDER=creem

# ============================================
# 数据库配置
# ============================================

DATABASE_URL=$databaseUrl

# ============================================
# 应用配置
# ============================================

NEXT_PUBLIC_APP_URL=$appUrl

# 认证密钥 (自动生成)
AUTH_SECRET=$authSecret

# 加密密钥 (自动生成)
ENCRYPTION_KEY=$encryptionKey

# ============================================
# 其他配置 (可选)
# ============================================

# Node 环境
NODE_ENV=development

# 调试模式
NEXT_PUBLIC_DEBUG=false
"@

# 写入文件
$envContent | Out-File -FilePath $envFile -Encoding UTF8

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  配置完成！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "配置文件已保存到: $envFile" -ForegroundColor Cyan
Write-Host ""

# 显示配置摘要
Write-Host "配置摘要:" -ForegroundColor Yellow
Write-Host "  Creem 环境: $creemEnv" -ForegroundColor Gray
Write-Host "  API Key: $($creemApiKey.Substring(0, [Math]::Min(20, $creemApiKey.Length)))..." -ForegroundColor Gray
Write-Host "  产品数量: $($productIds.Count)" -ForegroundColor Gray
Write-Host "  应用 URL: $appUrl" -ForegroundColor Gray
Write-Host ""

# 下一步提示
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "  1. 运行配置测试: npx tsx scripts/test-creem-payment.ts" -ForegroundColor Cyan
Write-Host "  2. 启动开发服务器: pnpm dev" -ForegroundColor Cyan
Write-Host "  3. 访问: $appUrl/pricing" -ForegroundColor Cyan
Write-Host "  4. 测试支付流程" -ForegroundColor Cyan
Write-Host ""

# 配置 Webhook URL
Write-Host "重要提示:" -ForegroundColor Red
Write-Host "  请在 Creem Dashboard 配置 Webhook URL:" -ForegroundColor Yellow
Write-Host "  $appUrl/api/payment/notify/creem" -ForegroundColor Cyan
Write-Host ""

# 询问是否立即运行测试
$runTest = Read-Host "是否立即运行配置测试? (y/n)"
if ($runTest -eq "y") {
    Write-Host ""
    Write-Host "正在运行测试..." -ForegroundColor Cyan
    npx tsx scripts/test-creem-payment.ts
}

Write-Host ""
Write-Host "配置完成！祝您使用愉快 🎉" -ForegroundColor Green
Write-Host ""










