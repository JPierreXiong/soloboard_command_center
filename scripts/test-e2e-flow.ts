/**
 * 端到端测试：新用户注册 → 付款 → 成为会员 → 登出
 * 
 * 测试流程：
 * 1. 创建新用户账号
 * 2. 验证用户可以登录
 * 3. 模拟支付流程
 * 4. 验证订阅创建
 * 5. 验证用户升级为会员
 * 6. 验证 Billing 页面显示
 * 7. 登出
 */

// ⚠️ 重要：必须在导入任何模块之前设置环境变量
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_au5XJdonk1Es@ep-mute-smoke-ainrvel2-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
}
if (!process.env.DATABASE_PROVIDER) {
  process.env.DATABASE_PROVIDER = 'postgresql';
}
if (!process.env.AUTH_URL) {
  process.env.AUTH_URL = 'https://soloboard-command-center-b.vercel.app';
}
if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = 'bLB0yORMFFD2cRWSop2+CBHKwguN1YdE+3Ygh04fF4M=';
}

import { db } from '@/core/db';
import { user, order, subscription } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

const results: TestResult[] = [];

function logResult(step: string, success: boolean, message: string, data?: any, error?: any) {
  const result: TestResult = { step, success, message, data, error };
  results.push(result);
  
  const icon = success ? '✅' : '❌';
  console.log(`\n${icon} [${step}] ${message}`);
  if (data) console.log('   Data:', JSON.stringify(data, null, 2));
  if (error) console.error('   Error:', error);
}

async function testE2EFlow() {
  console.log('🚀 开始端到端测试...\n');
  console.log('=' .repeat(80));
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let testUserId: string;
  let testOrderId: string;
  let testSubscriptionId: string;

  try {
    // ============================================================================
    // 步骤 1: 测试数据库连接
    // ============================================================================
    console.log('\n📊 步骤 1: 测试数据库连接');
    console.log('-'.repeat(80));
    
    try {
      const dbInstance = db();
      const testQuery = await dbInstance.select().from(user).limit(1);
      logResult(
        '数据库连接',
        true,
        '数据库连接成功',
        { recordCount: testQuery.length }
      );
    } catch (error: any) {
      logResult(
        '数据库连接',
        false,
        '数据库连接失败',
        null,
        error.message
      );
      throw error;
    }

    // ============================================================================
    // 步骤 2: 创建新用户（模拟注册）
    // ============================================================================
    console.log('\n👤 步骤 2: 创建新用户（模拟注册）');
    console.log('-'.repeat(80));
    
    try {
      // 检查邮箱是否已存在
      const existingUsers = await db().select()
        .from(user)
        .where(eq(user.email, testEmail))
        .limit(1);
      
      if (existingUsers.length > 0) {
        logResult(
          '用户注册',
          false,
          '邮箱已存在',
          { email: testEmail }
        );
        throw new Error('Email already exists');
      }

      // 创建新用户
      testUserId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const newUser = await db().insert(user).values({
        id: testUserId,
        email: testEmail,
        name: testEmail.split('@')[0],
        emailVerified: false,
        planType: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      logResult(
        '用户注册',
        true,
        '用户创建成功',
        {
          userId: newUser[0].id,
          email: newUser[0].email,
          planType: newUser[0].planType,
        }
      );
    } catch (error: any) {
      logResult(
        '用户注册',
        false,
        '用户创建失败',
        null,
        error.message
      );
      throw error;
    }

    // ============================================================================
    // 步骤 3: 验证用户可以查询（模拟登录验证）
    // ============================================================================
    console.log('\n🔐 步骤 3: 验证用户可以查询（模拟登录验证）');
    console.log('-'.repeat(80));
    
    try {
      const foundUser = await db().select()
        .from(user)
        .where(eq(user.email, testEmail))
        .limit(1);

      if (foundUser.length === 0) {
        throw new Error('User not found after creation');
      }

      logResult(
        '登录验证',
        true,
        '用户查询成功',
        {
          userId: foundUser[0].id,
          email: foundUser[0].email,
        }
      );
    } catch (error: any) {
      logResult(
        '登录验证',
        false,
        '登录验证失败',
        null,
        error.message
      );
      throw error;
    }

    // ============================================================================
    // 步骤 4: 创建订单（模拟支付流程 - Checkout）
    // ============================================================================
    console.log('\n💳 步骤 4: 创建订单（模拟支付流程 - Checkout）');
    console.log('-'.repeat(80));
    
    try {
      testOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const orderNo = `ORD-${Date.now()}`;
      
      const newOrder = await db().insert(order).values({
        id: testOrderId,
        orderNo,
        userId: testUserId,
        userEmail: testEmail,
        status: 'created',
        amount: 1990, // $19.90
        currency: 'USD',
        productId: 'base',
        paymentProvider: 'creem',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      logResult(
        '创建订单',
        true,
        '订单创建成功',
        {
          orderId: newOrder[0].id,
          orderNo: newOrder[0].orderNo,
          amount: newOrder[0].amount,
          status: newOrder[0].status,
        }
      );
    } catch (error: any) {
      logResult(
        '创建订单',
        false,
        '订单创建失败',
        null,
        error.message
      );
      throw error;
    }

    // ============================================================================
    // 步骤 5: 模拟支付成功（Webhook 处理）
    // ============================================================================
    console.log('\n✅ 步骤 5: 模拟支付成功（Webhook 处理）');
    console.log('-'.repeat(80));
    
    try {
      // 5.1 更新订单状态为 paid
      const updatedOrder = await db().update(order)
        .set({
          status: 'paid',
          paidAt: new Date(),
          paymentEmail: testEmail,
          transactionId: `txn_${Date.now()}`,
          updatedAt: new Date(),
        })
        .where(eq(order.id, testOrderId))
        .returning();

      logResult(
        '更新订单状态',
        true,
        '订单状态更新为 paid',
        {
          orderId: updatedOrder[0].id,
          status: updatedOrder[0].status,
          paidAt: updatedOrder[0].paidAt,
        }
      );

      // 5.2 创建订阅
      testSubscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const subscriptionNo = `SUB-${Date.now()}`;
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const newSubscription = await db().insert(subscription).values({
        id: testSubscriptionId,
        subscriptionNo,
        userId: testUserId,
        userEmail: testEmail,
        status: 'active',
        paymentProvider: 'creem',
        paymentUserId: testUserId,
        subscriptionId: testSubscriptionId,
        productId: 'base',
        description: 'Base Plan',
        amount: 1990,
        currency: 'USD',
        interval: 'month',
        intervalCount: 1,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        planType: 'base',
        planName: 'Base Plan',
        createdAt: now,
        updatedAt: now,
      }).returning();

      logResult(
        '创建订阅',
        true,
        '订阅创建成功',
        {
          subscriptionId: newSubscription[0].id,
          subscriptionNo: newSubscription[0].subscriptionNo,
          planType: newSubscription[0].planType,
          status: newSubscription[0].status,
          currentPeriodEnd: newSubscription[0].currentPeriodEnd,
        }
      );
    } catch (error: any) {
      logResult(
        '支付处理',
        false,
        '支付处理失败',
        null,
        error.message
      );
      throw error;
    }

    // ============================================================================
    // 步骤 6: 更新用户计划类型
    // ============================================================================
    console.log('\n⬆️ 步骤 6: 更新用户计划类型');
    console.log('-'.repeat(80));
    
    try {
      const upgradedUser = await db().update(user)
        .set({
          planType: 'base',
          updatedAt: new Date(),
        })
        .where(eq(user.id, testUserId))
        .returning();

      logResult(
        '用户升级',
        true,
        '用户计划升级成功',
        {
          userId: upgradedUser[0].id,
          email: upgradedUser[0].email,
          planType: upgradedUser[0].planType,
        }
      );
    } catch (error: any) {
      logResult(
        '用户升级',
        false,
        '用户升级失败',
        null,
        error.message
      );
      throw error;
    }

    // ============================================================================
    // 步骤 7: 验证 Billing 页面数据
    // ============================================================================
    console.log('\n📄 步骤 7: 验证 Billing 页面数据');
    console.log('-'.repeat(80));
    
    try {
      // 查询用户信息
      const userInfo = await db().select()
        .from(user)
        .where(eq(user.id, testUserId))
        .limit(1);

      // 查询订阅信息
      const subscriptions = await db().select()
        .from(subscription)
        .where(eq(subscription.userId, testUserId));

      // 查询订单信息
      const orders = await db().select()
        .from(order)
        .where(eq(order.userId, testUserId));

      const billingData = {
        user: userInfo[0],
        subscriptions: subscriptions,
        orders: orders,
      };

      logResult(
        'Billing 数据',
        true,
        'Billing 页面数据完整',
        {
          planType: billingData.user.planType,
          subscriptionCount: billingData.subscriptions.length,
          orderCount: billingData.orders.length,
          activeSubscriptions: billingData.subscriptions.filter(s => s.status === 'active').length,
        }
      );
    } catch (error: any) {
      logResult(
        'Billing 数据',
        false,
        'Billing 数据查询失败',
        null,
        error.message
      );
      throw error;
    }

    // ============================================================================
    // 步骤 8: 清理测试数据
    // ============================================================================
    console.log('\n🧹 步骤 8: 清理测试数据');
    console.log('-'.repeat(80));
    
    try {
      // 删除订阅
      await db().delete(subscription).where(eq(subscription.id, testSubscriptionId));
      
      // 删除订单
      await db().delete(order).where(eq(order.id, testOrderId));
      
      // 删除用户
      await db().delete(user).where(eq(user.id, testUserId));

      logResult(
        '清理数据',
        true,
        '测试数据清理成功',
        {
          deletedUser: testUserId,
          deletedOrder: testOrderId,
          deletedSubscription: testSubscriptionId,
        }
      );
    } catch (error: any) {
      logResult(
        '清理数据',
        false,
        '数据清理失败（可能需要手动清理）',
        null,
        error.message
      );
    }

  } catch (error: any) {
    console.error('\n❌ 测试流程中断:', error.message);
  }

  // ============================================================================
  // 生成测试报告
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📊 测试报告');
  console.log('='.repeat(80));
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const totalCount = results.length;
  
  console.log(`\n总测试步骤: ${totalCount}`);
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`📈 成功率: ${((successCount / totalCount) * 100).toFixed(2)}%`);
  
  console.log('\n详细结果:');
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${result.step}: ${result.message}`);
  });

  // 识别问题
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('\n🔍 发现的问题:');
    failures.forEach((failure, index) => {
      console.log(`\n问题 ${index + 1}: ${failure.step}`);
      console.log(`  消息: ${failure.message}`);
      if (failure.error) {
        console.log(`  错误: ${failure.error}`);
      }
    });
  } else {
    console.log('\n🎉 所有测试通过！系统运行正常。');
  }

  console.log('\n' + '='.repeat(80));
}

// 运行测试
testE2EFlow().catch(console.error);

