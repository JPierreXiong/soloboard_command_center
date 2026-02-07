/**
 * Phase 4-7 快速测试脚本
 * 用于快速验证核心功能是否正常工作
 * 
 * 使用方法：
 * npx tsx scripts/test-phase-4-7.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env.development') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getVaultPlanLevel } from '../src/shared/lib/digital-heirloom-plan-limits';
import { authenticateBeneficiary } from '../src/shared/lib/beneficiary-auth';
import { checkStorageLimit, checkBeneficiaryLimit, checkHeartbeatFrequency } from '../src/shared/lib/digital-heirloom-plan-limits';

async function testPhase4() {
  console.log('\n🧪 Phase 4: 成本控制逻辑测试\n');
  
  // 注意：这些测试需要实际的 Vault ID，请替换为测试数据
  const testVaultId = process.env.TEST_VAULT_ID || 'test-vault-id';
  
  if (testVaultId === 'test-vault-id') {
    console.log('   ⚠️  跳过 Phase 4 测试：TEST_VAULT_ID 未设置');
    console.log('   💡 请设置环境变量：export TEST_VAULT_ID="your-vault-id"\n');
    return;
  }
  
  try {
    // 测试 4.1: 存储限制检查
    console.log('1. 测试存储限制检查...');
    const storageCheck = await checkStorageLimit(testVaultId, 11 * 1024); // 11KB，超过 Free 限制
    console.log('   ✅ 存储限制检查:', storageCheck.allowed ? '通过' : '限制生效');
    if (!storageCheck.allowed) {
      console.log('   📝 限制原因:', storageCheck.reason);
    }
    
    // 测试 4.2: 受益人数量限制检查
    console.log('2. 测试受益人数量限制检查...');
    const beneficiaryCheck = await checkBeneficiaryLimit(testVaultId);
    console.log('   ✅ 受益人限制检查:', beneficiaryCheck.allowed ? '通过' : '限制生效');
    if (!beneficiaryCheck.allowed) {
      console.log('   📝 限制原因:', beneficiaryCheck.reason);
      console.log('   📊 当前数量:', beneficiaryCheck.currentCount, '/', beneficiaryCheck.maxCount);
    }
    
    // 测试 4.3: 心跳频率限制检查
    console.log('3. 测试心跳频率限制检查...');
    const frequencyCheck = await checkHeartbeatFrequency(testVaultId, 29); // 29 天，低于 Base 最小限制
    console.log('   ✅ 心跳频率限制检查:', frequencyCheck.allowed ? '通过' : '限制生效');
    if (!frequencyCheck.allowed) {
      console.log('   📝 限制原因:', frequencyCheck.reason);
      console.log('   📊 允许范围:', frequencyCheck.min, '-', frequencyCheck.max, '天');
    }
    
    // 测试 4.4: 获取计划等级
    console.log('4. 测试计划等级获取...');
    const planLevel = await getVaultPlanLevel(testVaultId);
    console.log('   ✅ 计划等级:', planLevel);
    
  } catch (error: any) {
    console.error('   ❌ Phase 4 测试失败:', error.message);
  }
}

async function testPhase6() {
  console.log('\n🧪 Phase 6: 受益人身份识别测试\n');
  
  const testToken = process.env.TEST_RELEASE_TOKEN || 'test-token';
  
  if (testToken === 'test-token') {
    console.log('   ⚠️  跳过 Phase 6 测试：TEST_RELEASE_TOKEN 未设置');
    console.log('   💡 请设置环境变量：export TEST_RELEASE_TOKEN="your-token"\n');
    return;
  }
  
  try {
    console.log('1. 测试 Token 验证...');
    const authResult = await authenticateBeneficiary(testToken);
    
    if (authResult.valid && authResult.context) {
      console.log('   ✅ Token 验证成功');
      console.log('   📝 受益人:', authResult.context.beneficiary.name);
      console.log('   📝 Vault 计划:', authResult.context.vault.planLevel);
      console.log('   📝 剩余解密次数:', authResult.context.beneficiary.remainingAttempts ?? '无限');
    } else {
      console.log('   ⚠️ Token 验证失败（这是正常的，如果使用测试 Token）');
      console.log('   📝 失败原因:', authResult.reason);
    }
  } catch (error: any) {
    console.error('   ❌ Phase 6 测试失败:', error.message);
  }
}

async function main() {
  console.log('🚀 Phase 4-7 快速测试开始\n');
  
  // 检查环境变量
  const testVaultId = process.env.TEST_VAULT_ID;
  const testToken = process.env.TEST_RELEASE_TOKEN;
  
  if (!testVaultId || testVaultId === 'test-vault-id') {
    console.log('⚠️  警告：TEST_VAULT_ID 未设置或使用默认值');
    console.log('   💡 请设置环境变量：export TEST_VAULT_ID="your-vault-id"\n');
  }
  
  if (!testToken || testToken === 'test-token') {
    console.log('⚠️  警告：TEST_RELEASE_TOKEN 未设置或使用默认值');
    console.log('   💡 请设置环境变量：export TEST_RELEASE_TOKEN="your-token"\n');
  }
  
  console.log('📋 注意：这些测试需要实际的数据库连接和测试数据');
  console.log('📋 如果没有设置测试数据，部分测试可能会失败（这是正常的）\n');
  
  try {
    await testPhase4();
    await testPhase6();
    
    console.log('\n✅ 快速测试完成！');
    console.log('📋 详细测试请参考：TESTING_GUIDE_PHASE_4_7.md');
    console.log('📋 测试检查清单：TESTING_CHECKLIST.md\n');
  } catch (error: any) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    console.error('   堆栈:', error.stack);
    process.exit(1);
  }
}

// 运行测试
main().catch(console.error);
