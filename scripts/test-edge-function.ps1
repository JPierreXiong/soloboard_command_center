# ============================================
# Edge Function 触发测试脚本 (PowerShell)
# 用途：手动触发 dead-man-check Edge Function
# ============================================

# 配置变量（请替换为你的实际值）
$SUPABASE_PROJECT_REF = "your-project-ref"  # ⚠️ 替换为你的项目 ID
$SUPABASE_ANON_KEY = "your-anon-key"        # ⚠️ 替换为你的 Anon Key

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Edge Function 触发测试" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查配置
if ($SUPABASE_PROJECT_REF -eq "your-project-ref" -or $SUPABASE_ANON_KEY -eq "your-anon-key") {
    Write-Host "❌ 请先配置 SUPABASE_PROJECT_REF 和 SUPABASE_ANON_KEY" -ForegroundColor Red
    Write-Host ""
    Write-Host "获取方式：" -ForegroundColor Yellow
    Write-Host "1. 访问 Supabase Dashboard"
    Write-Host "2. Settings -> API"
    Write-Host "3. 复制 Project URL 中的项目 ID"
    Write-Host "4. 复制 anon/public key"
    exit 1
}

# 构建 URL
$FUNCTION_URL = "https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/dead-man-check"

Write-Host "配置信息：" -ForegroundColor Yellow
Write-Host "  Project Ref: $SUPABASE_PROJECT_REF"
Write-Host "  Function URL: $FUNCTION_URL"
Write-Host ""

# 发送请求
Write-Host "正在触发 Edge Function..." -ForegroundColor Yellow
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $SUPABASE_ANON_KEY"
        "Content-Type" = "application/json"
    }

    $body = @{} | ConvertTo-Json

    $response = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post -Headers $headers -Body $body -ErrorAction Stop

    Write-Host "✅ Edge Function 执行成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "响应内容：" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    Write-Host "下一步验证：" -ForegroundColor Yellow
    Write-Host "1. 检查数据库 digital_vaults 表，status 应更新为 'warning'"
    Write-Host "2. 检查 dead_man_switch_events 表是否有新记录"
    Write-Host "3. 检查测试邮箱是否收到预警邮件"
} catch {
    Write-Host "❌ Edge Function 执行失败" -ForegroundColor Red
    Write-Host ""
    Write-Host "错误信息：" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "可能的原因：" -ForegroundColor Yellow
    Write-Host "1. Edge Function 未部署"
    Write-Host "2. 认证密钥错误"
    Write-Host "3. 函数内部错误（查看 Supabase Dashboard -> Edge Functions -> Logs）"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan




