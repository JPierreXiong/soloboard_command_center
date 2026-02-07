/**
 * Edge Function 资产释放逻辑测试脚本
 * 
 * 测试内容：
 * 1. 创建测试数据（用户、保险箱、受益人）
 * 2. 模拟宽限期已过的场景
 * 3. 调用 Edge Function 或创建测试 API 端点
 * 4. 验证资产释放结果
 * 
 * 执行方式：
 * npx tsx scripts/test-edge-function-asset-release.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { db } from '@/core/db';
import { 
  digitalVaults, 
  beneficiaries, 
  deadManSwitchEvents,
  user,
  shippingLogs,
} from '@/config/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUuid } from '@/shared/lib/hash';

// 测试配置
const TEST_CONFIG = {
  // 是否清理测试数据
  cleanup: true,
  // Edge Function URL（如果部署了）
  edgeFunctionUrl: process.env.SUPABASE_URL 
    ? `${process.env.SUPABASE_URL}/functions/v1/dead-man-check`
    : process.env.SUPABASE_EDGE_FUNCTION_URL || 'http://localhost:54321/functions/v1/dead-man-check',
  // Service Role Key（用于调用 Edge Function）
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  // Supabase URL
  supabaseUrl: process.env.SUPABASE_URL || '',
};

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
}

async function testEdgeFunctionAssetRelease() {
  console.log('🧪 Edge Function 资产释放逻辑测试\n');
  console.log('=' .repeat(60));
  
  const results: TestResult[] = [];
  let testUserId: string | null = null;
  let testVaultId: string | null = null;
  let testBeneficiaryId: string | null = null;

  try {
    // ============================================
    // Step 1: 创建测试用户（Pro 版）
    // ============================================
    console.log('\n📝 Step 1: 创建测试用户（Pro 版）');
    try {
      testUserId = getUuid();
      const testEmail = `test-asset-release-${Date.now()}@example.com`;
      
      await db().insert(user).values({
        id: testUserId,
        name: 'Test User Asset Release',
        email: testEmail,
        emailVerified: true,
        planType: 'pro', // Pro 版用户
      });

      console.log(`   ✅ 测试用户创建成功`);
      console.log(`      ID: ${testUserId}`);
      console.log(`      Email: ${testEmail}`);
      console.log(`      Plan: pro`);
      
      results.push({
        step: '创建测试用户',
        success: true,
        message: `用户创建成功: ${testEmail}`,
        data: { userId: testUserId, email: testEmail },
      });
    } catch (error: any) {
      console.error(`   ❌ 创建测试用户失败:`, error.message);
      results.push({
        step: '创建测试用户',
        success: false,
        message: error.message,
      });
      throw error;
    }

    // ============================================
    // Step 2: 创建数字保险箱（warning 状态）
    // ============================================
    console.log('\n📝 Step 2: 创建数字保险箱（warning 状态）');
    try {
      testVaultId = getUuid();
      
      // 设置 last_seen_at 为 100 天前（超过心跳频率 90 天）
      const lastSeenAt = new Date();
      lastSeenAt.setDate(lastSeenAt.getDate() - 100);

      await db().insert(digitalVaults).values({
        id: testVaultId,
        userId: testUserId!,
        encryptedData: 'test_encrypted_data_' + Date.now(),
        encryptionSalt: 'test_salt_' + Date.now(),
        encryptionIv: 'test_iv_' + Date.now(),
        heartbeatFrequency: 90,
        gracePeriod: 7, // 7 天宽限期
        deadManSwitchEnabled: true,
        status: 'warning', // 已经是 warning 状态
        lastSeenAt: lastSeenAt,
      });

      console.log(`   ✅ 保险箱创建成功`);
      console.log(`      ID: ${testVaultId}`);
      console.log(`      Status: warning`);
      console.log(`      Last Seen: ${lastSeenAt.toISOString()}`);
      
      results.push({
        step: '创建保险箱',
        success: true,
        message: `保险箱创建成功: ${testVaultId}`,
        data: { vaultId: testVaultId },
      });
    } catch (error: any) {
      console.error(`   ❌ 创建保险箱失败:`, error.message);
      results.push({
        step: '创建保险箱',
        success: false,
        message: error.message,
      });
      throw error;
    }

    // ============================================
    // Step 3: 创建预警事件（8 天前，超过宽限期）
    // ============================================
    console.log('\n📝 Step 3: 创建预警事件（8 天前，超过宽限期）');
    try {
      const warningSentAt = new Date();
      warningSentAt.setDate(warningSentAt.getDate() - 8); // 8 天前

      await db().insert(deadManSwitchEvents).values({
        id: getUuid(),
        vaultId: testVaultId!,
        eventType: 'warning_sent',
        eventData: JSON.stringify({
          triggered_at: warningSentAt.toISOString(),
          heartbeat_frequency: 90,
          grace_period: 7,
        }),
        createdAt: warningSentAt,
      });

      console.log(`   ✅ 预警事件创建成功`);
      console.log(`      预警时间: ${warningSentAt.toISOString()}`);
      console.log(`      宽限期: 7 天`);
      console.log(`      当前时间: ${new Date().toISOString()}`);
      console.log(`      状态: 已超过宽限期 ✅`);
      
      results.push({
        step: '创建预警事件',
        success: true,
        message: `预警事件创建成功，已超过宽限期`,
        data: { warningSentAt: warningSentAt.toISOString() },
      });
    } catch (error: any) {
      console.error(`   ❌ 创建预警事件失败:`, error.message);
      results.push({
        step: '创建预警事件',
        success: false,
        message: error.message,
      });
      throw error;
    }

    // ============================================
    // Step 4: 创建受益人（包含完整地址信息）
    // ============================================
    console.log('\n📝 Step 4: 创建受益人（包含完整地址信息）');
    try {
      testBeneficiaryId = getUuid();
      const beneficiaryEmail = `beneficiary-${Date.now()}@example.com`;

      await db().insert(beneficiaries).values({
        id: testBeneficiaryId,
        vaultId: testVaultId!,
        name: 'Test Beneficiary',
        email: beneficiaryEmail,
        relationship: 'friend',
        language: 'en',
        phone: '+852-1234-5678',
        receiverName: 'Test Beneficiary',
        addressLine1: '123 Test Street',
        city: 'Hong Kong',
        zipCode: '000000',
        countryCode: 'HKG',
        physicalAssetDescription: 'Encrypted Recovery Kit - Physical USB Drive',
        status: 'pending',
      });

      console.log(`   ✅ 受益人创建成功`);
      console.log(`      ID: ${testBeneficiaryId}`);
      console.log(`      Email: ${beneficiaryEmail}`);
      console.log(`      地址: 123 Test Street, Hong Kong`);
      console.log(`      物理资产: Encrypted Recovery Kit`);
      
      results.push({
        step: '创建受益人',
        success: true,
        message: `受益人创建成功: ${beneficiaryEmail}`,
        data: { beneficiaryId: testBeneficiaryId, email: beneficiaryEmail },
      });
    } catch (error: any) {
      console.error(`   ❌ 创建受益人失败:`, error.message);
      results.push({
        step: '创建受益人',
        success: false,
        message: error.message,
      });
      throw error;
    }

    // ============================================
    // Step 5: 验证测试数据
    // ============================================
    console.log('\n📝 Step 5: 验证测试数据');
    try {
      // 验证保险箱状态
      const vault = await db()
        .select()
        .from(digitalVaults)
        .where(eq(digitalVaults.id, testVaultId!))
        .limit(1);

      if (vault.length === 0 || vault[0].status !== 'warning') {
        throw new Error('保险箱状态不正确');
      }

      // 验证受益人状态
      const beneficiary = await db()
        .select()
        .from(beneficiaries)
        .where(eq(beneficiaries.id, testBeneficiaryId!))
        .limit(1);

      if (beneficiary.length === 0 || beneficiary[0].status !== 'pending') {
        throw new Error('受益人状态不正确');
      }

      // 验证预警事件
      const warningEvent = await db()
        .select()
        .from(deadManSwitchEvents)
        .where(
          and(
            eq(deadManSwitchEvents.vaultId, testVaultId!),
            eq(deadManSwitchEvents.eventType, 'warning_sent')
          )
        )
        .orderBy(deadManSwitchEvents.createdAt)
        .limit(1);

      if (warningEvent.length === 0) {
        throw new Error('预警事件不存在');
      }

      // 计算宽限期
      const warningSentAt = new Date(warningEvent[0].createdAt);
      const gracePeriodDays = vault[0].gracePeriod || 7;
      const gracePeriodEndDate = new Date(
        warningSentAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000
      );
      const now = new Date();
      const exceededGracePeriod = now >= gracePeriodEndDate;

      console.log(`   ✅ 测试数据验证成功`);
      console.log(`      保险箱状态: ${vault[0].status}`);
      console.log(`      受益人状态: ${beneficiary[0].status}`);
      console.log(`      预警时间: ${warningSentAt.toISOString()}`);
      console.log(`      宽限期结束: ${gracePeriodEndDate.toISOString()}`);
      console.log(`      当前时间: ${now.toISOString()}`);
      console.log(`      超过宽限期: ${exceededGracePeriod ? '✅ 是' : '❌ 否'}`);
      
      if (!exceededGracePeriod) {
        throw new Error('测试数据未超过宽限期，无法测试资产释放逻辑');
      }

      results.push({
        step: '验证测试数据',
        success: true,
        message: '测试数据验证成功，已超过宽限期',
        data: {
          vaultStatus: vault[0].status,
          beneficiaryStatus: beneficiary[0].status,
          exceededGracePeriod,
        },
      });
    } catch (error: any) {
      console.error(`   ❌ 验证测试数据失败:`, error.message);
      results.push({
        step: '验证测试数据',
        success: false,
        message: error.message,
      });
      throw error;
    }

    // ============================================
    // Step 6: 调用 Edge Function（如果配置了）
    // ============================================
    console.log('\n📝 Step 6: 调用 Edge Function');
    
    if (TEST_CONFIG.serviceRoleKey && TEST_CONFIG.edgeFunctionUrl) {
      try {
        console.log(`   调用 URL: ${TEST_CONFIG.edgeFunctionUrl}`);
        
        const response = await fetch(TEST_CONFIG.edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_CONFIG.serviceRoleKey}`,
          },
          body: JSON.stringify({}),
        });

        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(`Edge Function 调用失败: ${JSON.stringify(responseData)}`);
        }

        console.log(`   ✅ Edge Function 调用成功`);
        console.log(`      响应:`, JSON.stringify(responseData, null, 2));
        
        results.push({
          step: '调用 Edge Function',
          success: true,
          message: 'Edge Function 调用成功',
          data: responseData,
        });
      } catch (error: any) {
        console.error(`   ⚠️  Edge Function 调用失败:`, error.message);
        console.log(`   ℹ️  如果 Edge Function 未部署，可以跳过此步骤`);
        results.push({
          step: '调用 Edge Function',
          success: false,
          message: error.message,
        });
      }
    } else {
      console.log(`   ⚠️  Edge Function URL 或 Service Role Key 未配置`);
      console.log(`   ℹ️  跳过 Edge Function 调用`);
      console.log(`   ℹ️  可以在 Supabase Dashboard 中手动触发 Edge Function`);
      results.push({
        step: '调用 Edge Function',
        success: false,
        message: 'Edge Function URL 或 Service Role Key 未配置',
      });
    }

    // ============================================
    // Step 7: 验证资产释放结果
    // ============================================
    console.log('\n📝 Step 7: 验证资产释放结果');
    
    // 等待一下，让 Edge Function 处理完成（如果调用了）
    if (TEST_CONFIG.serviceRoleKey) {
      console.log(`   等待 3 秒让 Edge Function 处理完成...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    try {
      // 检查保险箱状态
      const vaultAfter = await db()
        .select()
        .from(digitalVaults)
        .where(eq(digitalVaults.id, testVaultId!))
        .limit(1);

      // 检查受益人状态
      const beneficiaryAfter = await db()
        .select()
        .from(beneficiaries)
        .where(eq(beneficiaries.id, testBeneficiaryId!))
        .limit(1);

      // 检查资产释放事件
      const releaseEvent = await db()
        .select()
        .from(deadManSwitchEvents)
        .where(
          and(
            eq(deadManSwitchEvents.vaultId, testVaultId!),
            eq(deadManSwitchEvents.eventType, 'assets_released')
          )
        )
        .limit(1);

      // 检查物流记录（如果有）
      const shippingLog = await db()
        .select()
        .from(shippingLogs)
        .where(eq(shippingLogs.beneficiaryId, testBeneficiaryId!))
        .limit(1);

      console.log(`   📊 验证结果:`);
      console.log(`      保险箱状态: ${vaultAfter[0]?.status || '未找到'} (期望: released)`);
      console.log(`      受益人状态: ${beneficiaryAfter[0]?.status || '未找到'} (期望: notified)`);
      console.log(`      释放令牌: ${beneficiaryAfter[0]?.releaseToken ? '✅ 已生成' : '❌ 未生成'}`);
      console.log(`      资产释放事件: ${releaseEvent.length > 0 ? '✅ 已记录' : '❌ 未记录'}`);
      console.log(`      物流记录: ${shippingLog.length > 0 ? '✅ 已创建' : '⚠️  未创建（可能未配置 ShipAny API）'}`);

      const vaultReleased = vaultAfter[0]?.status === 'released';
      const beneficiaryNotified = beneficiaryAfter[0]?.status === 'notified';
      const hasReleaseToken = !!beneficiaryAfter[0]?.releaseToken;
      const hasReleaseEvent = releaseEvent.length > 0;

      if (vaultReleased && beneficiaryNotified && hasReleaseToken && hasReleaseEvent) {
        console.log(`   ✅ 资产释放逻辑验证成功！`);
        results.push({
          step: '验证资产释放结果',
          success: true,
          message: '资产释放逻辑验证成功',
          data: {
            vaultStatus: vaultAfter[0]?.status,
            beneficiaryStatus: beneficiaryAfter[0]?.status,
            hasReleaseToken,
            hasReleaseEvent,
            hasShippingLog: shippingLog.length > 0,
          },
        });
      } else {
        console.log(`   ⚠️  部分验证失败，可能需要手动触发 Edge Function`);
        results.push({
          step: '验证资产释放结果',
          success: false,
          message: '部分验证失败',
          data: {
            vaultReleased,
            beneficiaryNotified,
            hasReleaseToken,
            hasReleaseEvent,
          },
        });
      }
    } catch (error: any) {
      console.error(`   ❌ 验证资产释放结果失败:`, error.message);
      results.push({
        step: '验证资产释放结果',
        success: false,
        message: error.message,
      });
    }

    // ============================================
    // 测试总结
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试总结');
    console.log('='.repeat(60));

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`\n总步骤数: ${totalCount}`);
    console.log(`成功: ${successCount}`);
    console.log(`失败: ${totalCount - successCount}`);

    console.log('\n详细结果:');
    results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`  ${index + 1}. ${icon} ${result.step}: ${result.message}`);
    });

    if (successCount === totalCount) {
      console.log('\n🎉 所有测试通过！');
    } else {
      console.log('\n⚠️  部分测试失败，请检查日志');
    }

    // ============================================
    // 清理测试数据（可选）
    // ============================================
    if (TEST_CONFIG.cleanup) {
      console.log('\n🧹 清理测试数据...');
      try {
        if (testBeneficiaryId) {
          await db().delete(beneficiaries).where(eq(beneficiaries.id, testBeneficiaryId));
        }
        if (testVaultId) {
          await db().delete(deadManSwitchEvents).where(eq(deadManSwitchEvents.vaultId, testVaultId));
          await db().delete(digitalVaults).where(eq(digitalVaults.id, testVaultId));
        }
        if (testUserId) {
          await db().delete(user).where(eq(user.id, testUserId));
        }
        console.log('   ✅ 测试数据清理完成');
      } catch (error: any) {
        console.error(`   ⚠️  清理测试数据失败:`, error.message);
        console.log(`   ℹ️  测试数据 ID:`);
        console.log(`      用户 ID: ${testUserId}`);
        console.log(`      保险箱 ID: ${testVaultId}`);
        console.log(`      受益人 ID: ${testBeneficiaryId}`);
      }
    } else {
      console.log('\nℹ️  保留测试数据（cleanup = false）');
      console.log(`   用户 ID: ${testUserId}`);
      console.log(`   保险箱 ID: ${testVaultId}`);
      console.log(`   受益人 ID: ${testBeneficiaryId}`);
    }

  } catch (error: any) {
    console.error('\n❌ 测试过程中发生错误:', error);
    console.error('错误堆栈:', error.stack);
    
    // 清理测试数据
    if (TEST_CONFIG.cleanup) {
      console.log('\n🧹 清理测试数据...');
      try {
        if (testBeneficiaryId) {
          await db().delete(beneficiaries).where(eq(beneficiaries.id, testBeneficiaryId));
        }
        if (testVaultId) {
          await db().delete(deadManSwitchEvents).where(eq(deadManSwitchEvents.vaultId, testVaultId));
          await db().delete(digitalVaults).where(eq(digitalVaults.id, testVaultId));
        }
        if (testUserId) {
          await db().delete(user).where(eq(user.id, testUserId));
        }
      } catch (cleanupError: any) {
        console.error('清理失败:', cleanupError.message);
      }
    }
    
    process.exit(1);
  }
}

// 运行测试
testEdgeFunctionAssetRelease()
  .then(() => {
    console.log('\n✅ 测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });

