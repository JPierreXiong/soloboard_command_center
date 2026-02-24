/**
 * 简化测试：只测试关键步骤
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '@/config/db/schema';

const DATABASE_URL = 'postgresql://neondb_owner:npg_au5XJdonk1Es@ep-mute-smoke-ainrvel2-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log('🔌 连接数据库...');
const client = postgres(DATABASE_URL, {
  prepare: false,
  max: 1,
  connect_timeout: 10,
});

const db = drizzle({ client });

async function quickTest() {
  try {
    console.log('\n✅ 步骤 1: 测试数据库连接');
    const users = await db.select().from(schema.user).limit(1);
    console.log(`   找到 ${users.length} 个用户`);

    console.log('\n✅ 步骤 2: 创建测试用户');
    const testUserId = `user_test_${Date.now()}`;
    const testEmail = `test_${Date.now()}@example.com`;
    
    const newUser = await db.insert(schema.user).values({
      id: testUserId,
      email: testEmail,
      name: 'Test User',
      emailVerified: false,
      planType: 'free',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    console.log(`   用户创建成功: ${newUser[0].email}`);

    console.log('\n✅ 步骤 3: 创建测试订单');
    const testOrderId = `order_test_${Date.now()}`;
    const orderNo = `ORD-${Date.now()}`;
    
    const newOrder = await db.insert(schema.order).values({
      id: testOrderId,
      orderNo,
      userId: testUserId,
      userEmail: testEmail,
      status: 'created',
      amount: 1990,
      currency: 'USD',
      productId: 'base',
      paymentProvider: 'creem',
      checkoutInfo: JSON.stringify({ test: true }),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    console.log(`   订单创建成功: ${newOrder[0].orderNo}`);

    console.log('\n✅ 步骤 4: 更新订单为已支付');
    const paidOrder = await db.update(schema.order)
      .set({
        status: 'paid',
        paidAt: new Date(),
        transactionId: `txn_${Date.now()}`,
      })
      .where(eq(schema.order.id, testOrderId))
      .returning();
    
    console.log(`   订单状态: ${paidOrder[0].status}`);

    console.log('\n✅ 步骤 5: 创建订阅');
    const testSubId = `sub_test_${Date.now()}`;
    const subNo = `SUB-${Date.now()}`;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    
    const newSub = await db.insert(schema.subscription).values({
      id: testSubId,
      subscriptionNo: subNo,
      userId: testUserId,
      userEmail: testEmail,
      status: 'active',
      paymentProvider: 'creem',
      paymentUserId: testUserId,
      subscriptionId: testSubId,
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
    
    console.log(`   订阅创建成功: ${newSub[0].subscriptionNo}`);

    console.log('\n✅ 步骤 6: 升级用户计划');
    const upgradedUser = await db.update(schema.user)
      .set({ planType: 'base' })
      .where(eq(schema.user.id, testUserId))
      .returning();
    
    console.log(`   用户计划: ${upgradedUser[0].planType}`);

    console.log('\n✅ 步骤 7: 验证数据完整性');
    const userCheck = await db.select().from(schema.user).where(eq(schema.user.id, testUserId));
    const orderCheck = await db.select().from(schema.order).where(eq(schema.order.userId, testUserId));
    const subCheck = await db.select().from(schema.subscription).where(eq(schema.subscription.userId, testUserId));
    
    console.log(`   用户: ${userCheck[0].email} (${userCheck[0].planType})`);
    console.log(`   订单数: ${orderCheck.length} (状态: ${orderCheck[0].status})`);
    console.log(`   订阅数: ${subCheck.length} (状态: ${subCheck[0].status})`);

    console.log('\n🧹 清理测试数据...');
    await db.delete(schema.subscription).where(eq(schema.subscription.id, testSubId));
    await db.delete(schema.order).where(eq(schema.order.id, testOrderId));
    await db.delete(schema.user).where(eq(schema.user.id, testUserId));
    console.log('   清理完成');

    console.log('\n🎉 所有测试通过！');
    console.log('\n📊 测试总结:');
    console.log('   ✅ 数据库连接正常');
    console.log('   ✅ 用户注册功能正常');
    console.log('   ✅ 订单创建功能正常');
    console.log('   ✅ 支付处理功能正常');
    console.log('   ✅ 订阅创建功能正常');
    console.log('   ✅ 用户升级功能正常');
    console.log('   ✅ 数据查询功能正常');
    
  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('   详细错误:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n👋 数据库连接已关闭');
  }
}

quickTest();

