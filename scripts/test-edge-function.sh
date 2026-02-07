#!/bin/bash

# ============================================
# Edge Function 触发测试脚本
# 用途：手动触发 dead-man-check Edge Function
# ============================================

# 配置变量（请替换为你的实际值）
SUPABASE_PROJECT_REF="your-project-ref"  # ⚠️ 替换为你的项目 ID
SUPABASE_ANON_KEY="your-anon-key"        # ⚠️ 替换为你的 Anon Key

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Edge Function 触发测试"
echo "=========================================="
echo ""

# 检查配置
if [ "$SUPABASE_PROJECT_REF" == "your-project-ref" ] || [ "$SUPABASE_ANON_KEY" == "your-anon-key" ]; then
  echo -e "${RED}❌ 请先配置 SUPABASE_PROJECT_REF 和 SUPABASE_ANON_KEY${NC}"
  echo ""
  echo "获取方式："
  echo "1. 访问 Supabase Dashboard"
  echo "2. Settings -> API"
  echo "3. 复制 Project URL 中的项目 ID"
  echo "4. 复制 anon/public key"
  exit 1
fi

# 构建 URL
FUNCTION_URL="https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/dead-man-check"

echo -e "${YELLOW}配置信息：${NC}"
echo "  Project Ref: $SUPABASE_PROJECT_REF"
echo "  Function URL: $FUNCTION_URL"
echo ""

# 发送请求
echo -e "${YELLOW}正在触发 Edge Function...${NC}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')

# 分离响应体和状态码
HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

echo -e "${YELLOW}响应状态码: ${NC}$HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ Edge Function 执行成功！${NC}"
  echo ""
  echo "响应内容："
  echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
  echo ""
  echo -e "${YELLOW}下一步验证：${NC}"
  echo "1. 检查数据库 digital_vaults 表，status 应更新为 'warning'"
  echo "2. 检查 dead_man_switch_events 表是否有新记录"
  echo "3. 检查测试邮箱是否收到预警邮件"
else
  echo -e "${RED}❌ Edge Function 执行失败${NC}"
  echo ""
  echo "错误响应："
  echo "$HTTP_BODY"
  echo ""
  echo "可能的原因："
  echo "1. Edge Function 未部署"
  echo "2. 认证密钥错误"
  echo "3. 函数内部错误（查看 Supabase Dashboard -> Edge Functions -> Logs）"
fi

echo ""
echo "=========================================="




