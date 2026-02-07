/**
 * Phase 5: 管理员补偿功能测试脚本
 * 
 * 注意：此脚本需要管理员权限才能运行
 * 需要先登录管理员账户或设置管理员认证
 * 
 * 使用方法：
 * 1. 确保已登录管理员账户
 * 2. 设置测试环境变量
 * 3. 运行: npx tsx scripts/test-phase-5-admin.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env.development') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const VAULT_ID = process.env.TEST_VAULT_ID || 'e2734f7f-1657-4670-a6e1-46c6a895e5a6';

interface CompensationRequest {
  type: 'EXTEND_SUBSCRIPTION' | 'RESET_DECRYPTION_COUNT' | 'ADD_DECRYPTION_COUNT' | 'ADD_BONUS_DECRYPTION_COUNT';
  value?: number;
  beneficiaryId?: string;
  reason?: string;
}

async function testAdminCompensation() {
  console.log('🧪 Phase 5: 管理员补偿功能测试\n');
  console.log(`📋 测试 Vault ID: ${VAULT_ID}`);
  console.log(`📋 API Base URL: ${BASE_URL}\n`);

  // 注意：实际测试需要管理员认证
  // 这里提供测试示例和说明

  console.log('⚠️  注意：此测试需要管理员权限');
  console.log('💡 请确保：');
  console.log('   1. 已登录管理员账户');
  console.log('   2. 有有效的管理员会话');
  console.log('   3. 用户具有 admin.access 权限\n');

  console.log('📋 测试场景：\n');

  // 测试场景 1: 延期订阅
  console.log('1️⃣ 测试延期订阅（EXTEND_SUBSCRIPTION）');
  console.log('   API: POST /api/admin/digital-heirloom/vaults/[vaultId]/grant-compensation');
  console.log('   请求体:');
  console.log('   {');
  console.log('     "type": "EXTEND_SUBSCRIPTION",');
  console.log('     "value": 30,');
  console.log('     "reason": "Test compensation - extend subscription"');
  console.log('   }\n');

  // 测试场景 2: 重置解密次数
  console.log('2️⃣ 测试重置解密次数（RESET_DECRYPTION_COUNT）');
  console.log('   API: POST /api/admin/digital-heirloom/vaults/[vaultId]/grant-compensation');
  console.log('   请求体:');
  console.log('   {');
  console.log('     "type": "RESET_DECRYPTION_COUNT",');
  console.log('     "reason": "Test compensation - reset decryption count"');
  console.log('   }\n');

  // 测试场景 3: 增加解密次数
  console.log('3️⃣ 测试增加解密次数（ADD_DECRYPTION_COUNT）');
  console.log('   API: POST /api/admin/digital-heirloom/vaults/[vaultId]/grant-compensation');
  console.log('   请求体:');
  console.log('   {');
  console.log('     "type": "ADD_DECRYPTION_COUNT",');
  console.log('     "value": 5,');
  console.log('     "reason": "Test compensation - add decryption count"');
  console.log('   }\n');

  // 测试场景 4: 增加赠送解密次数
  console.log('4️⃣ 测试增加赠送解密次数（ADD_BONUS_DECRYPTION_COUNT）');
  console.log('   API: POST /api/admin/digital-heirloom/vaults/[vaultId]/grant-compensation');
  console.log('   请求体:');
  console.log('   {');
  console.log('     "type": "ADD_BONUS_DECRYPTION_COUNT",');
  console.log('     "value": 3,');
  console.log('     "reason": "Test compensation - add bonus decryption count"');
  console.log('   }\n');

  console.log('📋 使用 curl 测试示例：\n');
  console.log(`curl -X POST "${BASE_URL}/api/admin/digital-heirloom/vaults/${VAULT_ID}/grant-compensation" \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "Cookie: your-session-cookie" \\');
  console.log('  -d \'{"type":"EXTEND_SUBSCRIPTION","value":30,"reason":"Test"}\'\n');

  console.log('📋 使用 PowerShell 测试示例：\n');
  console.log(`$response = Invoke-RestMethod -Uri "${BASE_URL}/api/admin/digital-heirloom/vaults/${VAULT_ID}/grant-compensation" \\`);
  console.log('  -Method POST \\');
  console.log('  -ContentType "application/json" \\');
  console.log('  -Headers @{"Cookie"="your-session-cookie"} \\');
  console.log('  -Body \'{"type":"EXTEND_SUBSCRIPTION","value":30,"reason":"Test"}\'\n');

  console.log('📋 检查清单：');
  console.log('   [ ] 延期订阅功能正常');
  console.log('   [ ] 重置解密次数功能正常');
  console.log('   [ ] 增加解密次数功能正常');
  console.log('   [ ] 增加赠送解密次数功能正常');
  console.log('   [ ] 权限验证正确（非管理员无法访问）');
  console.log('   [ ] 错误处理正确（无效 Vault ID、无效参数等）');
  console.log('   [ ] 审计日志正确记录\n');

  console.log('💡 提示：');
  console.log('   1. 使用浏览器开发者工具获取管理员会话 Cookie');
  console.log('   2. 或使用 Postman 等工具进行 API 测试');
  console.log('   3. 参考 TESTING_PHASE_5_7_GUIDE.md 获取详细测试指南\n');
}

// 运行测试
testAdminCompensation().catch(console.error);
