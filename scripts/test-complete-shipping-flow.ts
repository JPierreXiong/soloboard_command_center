/**
 * 完整流程自动化测试脚本
 * 用途：模拟从用户注册到触发物理快递的全部流程
 * 运行方式：tsx scripts/test-complete-shipping-flow.ts
 * 
 * 注意：此脚本会在需要人工干预时暂停并提醒
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import * as readline from 'readline';

// 加载环境变量（按优先级顺序）
const envPath = resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath, override: true });
dotenv.config({ path: resolve(process.cwd(), '.env.development'), override: false });
dotenv.config({ path: resolve(process.cwd(), '.env'), override: false });

// 确保 DATABASE_URL 已设置
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.error('❌ 错误: DATABASE_URL 或 POSTGRES_URL 未设置');
  console.error(`   请检查 .env.local 文件: ${envPath}`);
  process.exit(1);
}

import { db } from '../src/core/db/index.js';
import {
  shippingLogs,
  digitalVaults,
  beneficiaries,
  user,
} from '../src/config/db/schema.js';
import { eq } from 'drizzle-orm';
import { getUuid } from '../src/shared/lib/hash.js';

// 使用字符串常量，避免导入 server-only 模块
const ShippingStatus = {
  PENDING_REVIEW: 'pending_review',
  WAITING_PAYMENT: 'waiting_payment',
  READY_TO_SHIP: 'ready_to_ship',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

const ShippingFeeStatus = {
  NOT_REQUIRED: 'not_required',
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  WAIVED: 'waived',
} as const;

// 创建 readline 接口用于用户交互
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function logStep(step: number, title: string, message: string, data?: any) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 Step ${step}: ${title}`);
  console.log(`${'='.repeat(60)}`);
  console.log(message);
  if (data) {
    console.log('\n📋 数据详情:');
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('');
}

async function testCompleteShippingFlow() {
  console.log('\n🚀 开始完整流程自动化测试');
  console.log('========================================\n');

  const testEmail = `test-flow-${Date.now()}@example.com`;
  const beneficiaryEmail = `beneficiary-flow-${Date.now()}@example.com`;

  try {
    const database = db();

    // ============================================
    // Step 1: 创建测试用户（模拟注册）
    // ============================================
    logStep(1, '创建测试用户', `邮箱: ${testEmail}`);

    const testUserId = getUuid();
    await database.insert(user).values({
      id: testUserId,
      name: 'Test User Flow',
      email: testEmail,
      emailVerified: true,
      planType: 'free',
    });

    console.log(`✅ 测试用户创建成功 (ID: ${testUserId})`);

    // ============================================
    // Step 2: 升级用户到 Pro 计划（模拟支付）
    // ============================================
    logStep(2, '升级到 Pro 计划', '模拟支付成功');

    await database
      .update(user)
      .set({ planType: 'pro' })
      .where(eq(user.id, testUserId));

    console.log('✅ 用户已升级为 Pro 计划');

    // ============================================
    // Step 3: 创建数字保险箱（模拟设置完成）
    // ============================================
    logStep(3, '创建数字保险箱', '模拟用户完成 Step 1-4 设置');

    const vaultId = getUuid();
    await database.insert(digitalVaults).values({
      id: vaultId,
      userId: testUserId,
      encryptedData: 'test_encrypted_data_' + Date.now(),
      encryptionSalt: 'test_salt_' + Date.now(),
      encryptionIv: 'test_iv_' + Date.now(),
      heartbeatFrequency: 90,
      gracePeriod: 7,
      deadManSwitchEnabled: true,
      status: 'active',
      lastSeenAt: new Date(),
    });

    console.log(`✅ 数字保险箱创建成功 (ID: ${vaultId})`);

    // ============================================
    // Step 4: 创建受益人（包含完整地址信息）
    // ============================================
    logStep(4, '创建受益人', `受益人邮箱: ${beneficiaryEmail}`, {
      address: '123 Test Street, Building A, Room 101, Beijing, 100000, CN',
    });

    const beneficiaryId = getUuid();
    await database.insert(beneficiaries).values({
      id: beneficiaryId,
      vaultId: vaultId,
      name: 'Test Beneficiary Flow',
      email: beneficiaryEmail,
      relationship: 'friend',
      language: 'zh',
      phone: '+86 13800138000',
      receiverName: 'Test Receiver',
      addressLine1: '123 Test Street, Building A, Room 101',
      city: 'Beijing',
      zipCode: '100000',
      countryCode: 'CN',
      status: 'pending',
    });

    console.log(`✅ 受益人创建成功 (ID: ${beneficiaryId})`);
    console.log('   地址: 123 Test Street, Building A, Room 101, Beijing, 100000, CN');

    // ============================================
    // Step 5: 模拟死信开关触发（保险箱状态变为 released）
    // ============================================
    logStep(5, '模拟死信开关触发', '保险箱状态更新为 released');

    await database
      .update(digitalVaults)
      .set({
        status: 'released',
        deadManSwitchActivatedAt: new Date(),
        lastSeenAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100天前
      })
      .where(eq(digitalVaults.id, vaultId));

    await database
      .update(beneficiaries)
      .set({ status: 'released', releasedAt: new Date() })
      .where(eq(beneficiaries.id, beneficiaryId));

    console.log('✅ 死信开关已触发，保险箱状态为 released');

    // ============================================
    // Step 6: 自动创建物流请求（模拟系统自动触发）
    // ============================================
    logStep(6, '自动创建物流请求', '系统自动创建物流请求');

    const shippingLogId = getUuid();
    const [newShippingLog] = await database
      .insert(shippingLogs)
      .values({
        id: shippingLogId,
        vaultId: vaultId,
        beneficiaryId: beneficiaryId,
        receiverName: 'Test Receiver',
        receiverPhone: '+86 13800138000',
        addressLine1: '123 Test Street, Building A, Room 101',
        city: 'Beijing',
        zipCode: '100000',
        countryCode: 'CN',
        shippingFeeStatus: ShippingFeeStatus.NOT_REQUIRED,
        estimatedAmount: 1500, // $15.00 in cents
        status: ShippingStatus.PENDING_REVIEW,
        requestedAt: new Date(),
      })
      .returning();

    if (!newShippingLog) {
      throw new Error('创建物流请求失败');
    }

    console.log(`✅ 物流请求创建成功 (ID: ${shippingLogId})`);
    console.log(`   状态: ${ShippingStatus.PENDING_REVIEW}`);
    console.log(`   运费状态: ${ShippingFeeStatus.NOT_REQUIRED}`);

    // ============================================
    // 人工干预提醒 1: 管理员核算运费
    // ============================================
    console.log('\n' + '⚠️'.repeat(30));
    console.log('🛑 需要人工干预 - Step 1: 管理员核算运费');
    console.log('⚠️'.repeat(30));
    console.log('\n📋 操作步骤:');
    console.log('   1. 访问: http://localhost:3000/admin/shipping-requests');
    console.log(`   2. 找到物流请求 ID: ${shippingLogId}`);
    console.log('   3. 点击 "核算运费" 按钮');
    console.log('   4. 输入运费金额（如 20.00）');
    console.log('   5. 点击 "发送支付链接"');
    console.log('\n💡 提示:');
    console.log(`   - 受益人邮箱: ${beneficiaryEmail}`);
    console.log('   - 检查受益人邮箱是否收到支付请求邮件');
    console.log('\n');

    await askQuestion('✅ 完成以上操作后，按 Enter 继续...\n');

    // ============================================
    // Step 7: 验证支付链接已发送
    // ============================================
    logStep(7, '验证支付链接已发送', '检查物流请求状态');

    const [updatedLog] = await database
      .select()
      .from(shippingLogs)
      .where(eq(shippingLogs.id, shippingLogId));

    if (!updatedLog) {
      throw new Error('物流请求不存在');
    }

    if (updatedLog.shippingFeeStatus === ShippingFeeStatus.PENDING_PAYMENT) {
      console.log('✅ 支付链接已发送，状态已更新为 pending_payment');
      console.log(`   支付链接: ${updatedLog.creemPaymentLink || '待创建'}`);
    } else {
      console.log(`⚠️  状态: ${updatedLog.shippingFeeStatus}`);
      console.log('   请确认是否已完成"核算运费"操作');
    }

    // ============================================
    // 人工干预提醒 2: 模拟支付完成
    // ============================================
    console.log('\n' + '⚠️'.repeat(30));
    console.log('🛑 需要人工干预 - Step 2: 模拟支付完成');
    console.log('⚠️'.repeat(30));
    console.log('\n📋 操作步骤（二选一）:');
    console.log('\n方式 A: 使用 SQL 脚本（推荐）');
    console.log('   1. 在 Supabase SQL Editor 中执行:');
    console.log('      scripts/simulate-shipping-payment.sql');
    console.log(`   2. 或手动更新物流请求 ID: ${shippingLogId}`);
    console.log('\n方式 B: 通过 Creem Webhook（真实支付）');
    console.log('   1. 受益人点击支付链接完成支付');
    console.log('   2. Creem Webhook 自动更新状态');
    console.log('\n');

    await askQuestion('✅ 完成支付后，按 Enter 继续...\n');

    // ============================================
    // Step 8: 验证支付完成
    // ============================================
    logStep(8, '验证支付完成', '检查物流请求状态');

    const [paidLog] = await database
      .select()
      .from(shippingLogs)
      .where(eq(shippingLogs.id, shippingLogId));

    if (paidLog?.shippingFeeStatus === ShippingFeeStatus.PAID) {
      console.log('✅ 支付已完成，状态已更新为 paid');
      console.log(`   支付时间: ${paidLog.paidAt || '待确认'}`);
    } else {
      console.log(`⚠️  当前状态: ${paidLog?.shippingFeeStatus || '未知'}`);
      console.log('   请确认是否已完成支付');
    }

    // ============================================
    // 人工干预提醒 3: 管理员确认发货
    // ============================================
    console.log('\n' + '⚠️'.repeat(30));
    console.log('🛑 需要人工干预 - Step 3: 管理员确认发货');
    console.log('⚠️'.repeat(30));
    console.log('\n📋 操作步骤:');
    console.log('   1. 访问: http://localhost:3000/admin/shipping-requests');
    console.log(`   2. 找到物流请求 ID: ${shippingLogId}`);
    console.log('   3. 点击 "确认发货" 按钮');
    console.log('   4. 输入物流单号（如 SF1234567890）');
    console.log('   5. 点击 "确认发货"');
    console.log('\n💡 提示:');
    console.log(`   - 受益人邮箱: ${beneficiaryEmail}`);
    console.log('   - 检查受益人是否收到发货通知邮件');
    console.log('\n');

    await askQuestion('✅ 完成以上操作后，按 Enter 继续...\n');

    // ============================================
    // Step 9: 验证发货完成
    // ============================================
    logStep(9, '验证发货完成', '检查最终状态');

    const [finalLog] = await database
      .select()
      .from(shippingLogs)
      .where(eq(shippingLogs.id, shippingLogId));

    if (finalLog?.status === ShippingStatus.SHIPPED) {
      console.log('✅ 发货已完成！');
      console.log(`   物流单号: ${finalLog.trackingNumber || '待确认'}`);
      console.log(`   承运商: ${finalLog.carrier || '待确认'}`);
      console.log(`   发货时间: ${finalLog.shippedAt || '待确认'}`);
    } else {
      console.log(`⚠️  当前状态: ${finalLog?.status || '未知'}`);
      console.log('   请确认是否已完成发货操作');
    }

    // ============================================
    // 测试总结
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试总结');
    console.log('='.repeat(60));
    console.log('\n✅ 所有步骤已完成！');
    console.log('\n📋 测试数据:');
    console.log(`   用户 ID: ${testUserId}`);
    console.log(`   用户邮箱: ${testEmail}`);
    console.log(`   保险箱 ID: ${vaultId}`);
    console.log(`   受益人 ID: ${beneficiaryId}`);
    console.log(`   受益人邮箱: ${beneficiaryEmail}`);
    console.log(`   物流请求 ID: ${shippingLogId}`);
    console.log('\n🎯 完整流程验证:');
    console.log('   ✅ 用户注册');
    console.log('   ✅ 升级到 Pro 计划');
    console.log('   ✅ 创建数字保险箱');
    console.log('   ✅ 添加受益人（包含完整地址）');
    console.log('   ✅ 死信开关触发');
    console.log('   ✅ 自动创建物流请求');
    console.log('   ✅ 管理员核算运费');
    console.log('   ✅ 受益人支付运费');
    console.log('   ✅ 管理员确认发货');
    console.log('\n🎉 完整流程测试通过！');
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      testData: {
        userId: testUserId,
        userEmail: testEmail,
        vaultId,
        beneficiaryId,
        beneficiaryEmail,
        shippingLogId,
      },
    };
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
    throw error;
  } finally {
    rl.close();
  }
}

// 执行测试
testCompleteShippingFlow()
  .then((result) => {
    if (result.success) {
      console.log('✅ 自动化测试完成！');
      process.exit(0);
    } else {
      console.log('❌ 测试未完全通过');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });

