/**
 * 运行所有 Phase 测试的汇总脚本
 * 
 * 使用方法：
 * npx tsx scripts/test-all-phases.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env.development') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function runAllTests() {
  console.log('🚀 Phase 4-7 完整测试套件\n');
  console.log('=' .repeat(60) + '\n');

  const vaultId = process.env.TEST_VAULT_ID || 'e2734f7f-1657-4670-a6e1-46c6a895e5a6';
  const releaseToken = process.env.TEST_RELEASE_TOKEN;

  console.log('📋 测试配置：');
  console.log(`   Vault ID: ${vaultId}`);
  console.log(`   Release Token: ${releaseToken ? '✅ 已设置' : '❌ 未设置'}\n`);

  console.log('📊 测试状态：\n');

  // Phase 4
  console.log('✅ Phase 4: 成本控制逻辑');
  console.log('   状态: 已完成并通过');
  console.log('   测试脚本: npx tsx scripts/test-phase-4-7.ts\n');

  // Phase 5
  console.log('⏳ Phase 5: 管理员补偿功能');
  console.log('   状态: 待测试（需要管理员权限）');
  console.log('   测试脚本: npx tsx scripts/test-phase-5-admin.ts');
  console.log('   测试指南: TESTING_PHASE_5_7_GUIDE.md\n');

  // Phase 6
  console.log('✅ Phase 6: 受益人身份识别');
  console.log('   状态: 已完成并通过');
  console.log('   测试脚本: npx tsx scripts/test-phase-4-7.ts\n');

  // Phase 7
  console.log('⏳ Phase 7: 付费转化');
  console.log('   状态: 待测试（需要 UI 测试）');
  console.log('   测试脚本: npx tsx scripts/test-phase-7-ui.ts');
  console.log('   测试指南: TESTING_PHASE_5_7_GUIDE.md\n');

  console.log('=' .repeat(60) + '\n');

  console.log('📋 快速测试命令：\n');

  console.log('1. Phase 4 + Phase 6（立即可用）:');
  console.log(`   $env:TEST_VAULT_ID="${vaultId}"`);
  if (releaseToken) {
    console.log(`   $env:TEST_RELEASE_TOKEN="${releaseToken}"`);
  } else {
    console.log('   # 先运行: npx tsx scripts/create-test-beneficiary.ts');
  }
  console.log('   npx tsx scripts/test-phase-4-7.ts\n');

  console.log('2. Phase 5（需要管理员权限）:');
  console.log('   npx tsx scripts/test-phase-5-admin.ts');
  console.log('   # 或使用 Postman/curl 测试 API\n');

  console.log('3. Phase 7（需要 UI 测试）:');
  console.log('   npm run dev');
  console.log('   npx tsx scripts/test-phase-7-ui.ts');
  console.log('   # 然后在浏览器中测试\n');

  console.log('=' .repeat(60) + '\n');

  console.log('📊 测试进度：2/4 Phases 完成 (50%)\n');

  console.log('📚 相关文档：');
  console.log('   - TESTING_RESULTS.md - 测试结果总结');
  console.log('   - TESTING_PHASE_5_7_GUIDE.md - Phase 5/7 测试指南');
  console.log('   - TESTING_FINAL_SUMMARY.md - 最终测试总结');
  console.log('   - TESTING_QUICK_REFERENCE.md - 快速参考指南\n');
}

// 运行测试
runAllTests().catch(console.error);
