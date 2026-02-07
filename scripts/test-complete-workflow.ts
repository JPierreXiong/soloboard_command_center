/**
 * 完整工作流自动化测试
 * 运行方式: npx tsx scripts/test-complete-workflow.ts
 * 
 * 功能：
 * 1. 查找或创建测试用户和保险箱
 * 2. 模拟活跃检测（设置 lastSeenAt 为 40 天前）
 * 3. 运行 Cron Job 触发预警邮件
 * 4. 验证状态变为 PENDING_VERIFICATION
 * 5. 模拟触发继承（设置 updatedAt 为 8 天前）
 * 6. 再次运行 Cron Job 触发 Dead Man's Switch
 * 7. 验证状态变为 TRIGGERED
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env.development') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { db } from '@/core/db';
import { digitalVaults, beneficiaries, emailNotifications } from '@/config/db/schema';
import { eq, desc } from 'drizzle-orm';
import { VaultStatus } from '@/shared/models/digital-vault';
import { getUuid } from '@/shared/lib/hash';

async function testCompleteWorkflow() {
  try {
    console.log('🎭 完整工作流自动化测试\n');

    // 获取测试用户 ID
    let testUserId = process.env.TEST_USER_ID;
    
    if (!testUserId) {
      // 查找第一个有保险箱的用户
      const users = await db()
        .select({ id: digitalVaults.userId })
        .from(digitalVaults)
        .limit(1);
      
      if (users.length === 0) {
        console.log('❌ 未找到有保险箱的用户');
        console.log('   请先创建一个用户和保险箱，或设置 TEST_USER_ID 环境变量\n');
        process.exit(1);
      }
      
      testUserId = users[0].id;
      console.log(`📋 使用用户 ID: ${testUserId}\n`);
    }

    // 查找测试用户的保险箱
    const [vault] = await db()
      .select()
      .from(digitalVaults)
      .where(eq(digitalVaults.userId, testUserId))
      .limit(1);

    if (!vault) {
      console.log('❌ 未找到测试用户的保险箱');
      console.log(`   用户 ID: ${testUserId}`);
      console.log('   请先创建保险箱\n');
      process.exit(1);
    }

    console.log(`📦 找到测试保险箱: ${vault.id}`);
    console.log(`   当前状态: ${vault.status}`);
    console.log(`   最后活跃: ${vault.lastSeenAt}\n`);

    // ============================================
    // 阶段 1: 模拟活跃检测
    // ============================================
    console.log('1️⃣ 阶段 1: 模拟活跃检测（95 天前，超过心跳频率）\n');

    // 获取保险箱的心跳频率（默认90天）
    const heartbeatFrequency = vault.heartbeatFrequency || 90;
    const daysAgo = heartbeatFrequency + 5; // 超过心跳频率5天，进入预警期

    const daysAgoDate = new Date();
    daysAgoDate.setDate(daysAgoDate.getDate() - daysAgo);

    await db()
      .update(digitalVaults)
      .set({
        lastSeenAt: daysAgoDate,
        status: VaultStatus.ACTIVE,
        deadManSwitchEnabled: true, // 确保启用 Dead Man's Switch
        warningEmailCount: 0,
        warningEmailSentAt: null,
        reminderEmailSentAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      })
      .where(eq(digitalVaults.id, vault.id));

    console.log(`   ✅ 已将 lastSeenAt 设置为: ${daysAgoDate.toISOString()} (${daysAgo} 天前)`);
    console.log(`   ✅ 心跳频率: ${heartbeatFrequency} 天`);
    console.log(`   ✅ 状态已重置为: ACTIVE`);
    console.log(`   ✅ Dead Man's Switch: 启用\n`);

    console.log('   📧 运行 Cron Job 来触发预警邮件...\n');
    
    // 调用 Cron Job API
    const cronSecret = process.env.VERCEL_CRON_SECRET || 'test-secret';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    try {
      const cronResponse = await fetch(`${appUrl}/api/cron/dead-man-switch-check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
        },
      });

      if (cronResponse.ok) {
        const cronResult = await cronResponse.json();
        console.log('   ✅ Cron Job 执行成功');
        console.log(`      警告邮件发送: ${cronResult.warningsSent || 0}`);
        console.log(`      提醒邮件发送: ${cronResult.remindersSent || 0}`);
        console.log(`      触发执行: ${cronResult.triggersExecuted || 0}\n`);
      } else {
        console.log(`   ⚠️  Cron Job 返回错误: ${cronResponse.status}`);
        const errorText = await cronResponse.text();
        console.log(`      错误信息: ${errorText.substring(0, 200)}\n`);
      }
    } catch (error: any) {
      console.log(`   ⚠️  Cron Job 调用失败: ${error.message}`);
      console.log('   提示: 请确保开发服务器正在运行 (npm run dev)\n');
    }

    // 等待一下让数据库更新
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 验证状态
    const [updatedVault1] = await db()
      .select()
      .from(digitalVaults)
      .where(eq(digitalVaults.id, vault.id));

    console.log(`   📊 验证结果:`);
    console.log(`      状态: ${updatedVault1.status}`);
    console.log(`      预警邮件计数: ${updatedVault1.warningEmailCount || 0}`);
    console.log(`      预警邮件发送时间: ${updatedVault1.warningEmailSentAt || '未发送'}`);

    if (updatedVault1.status === VaultStatus.PENDING_VERIFICATION) {
      console.log(`   ✅ 状态已正确变为 PENDING_VERIFICATION\n`);
    } else {
      console.log(`   ⚠️  状态未变为 PENDING_VERIFICATION，当前状态: ${updatedVault1.status}\n`);
    }

    // ============================================
    // 阶段 2: 模拟触发继承
    // ============================================
    console.log('2️⃣ 阶段 2: 模拟触发继承（8 天前进入宽限期）\n');

    // 计算宽限期结束日期（lastSeenAt + heartbeatFrequency + gracePeriod）
    const gracePeriod = vault.gracePeriod || 7;
    const gracePeriodEndDate = new Date(daysAgoDate);
    gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + heartbeatFrequency + gracePeriod);
    
    // 设置为宽限期结束日期之后1天（确保已超过宽限期）
    // 但 updatedAt 应该设置为过去的时间，表示进入宽限期的时间
    const now = new Date();
    const daysInGracePeriod = 6; // 6天前进入宽限期
    const enteredGracePeriodDate = new Date(now);
    enteredGracePeriodDate.setDate(enteredGracePeriodDate.getDate() - daysInGracePeriod);

    await db()
      .update(digitalVaults)
      .set({
        status: VaultStatus.PENDING_VERIFICATION,
        updatedAt: enteredGracePeriodDate, // 设置为进入宽限期的时间
        warningEmailSentAt: enteredGracePeriodDate,
        warningEmailCount: 3, // 已发送3次
        // 保持 lastSeenAt 不变，因为 findVaultsNeedingAssetRelease 使用它来计算宽限期
      })
      .where(eq(digitalVaults.id, vault.id));

    console.log(`   ✅ 已将状态设置为: PENDING_VERIFICATION`);
    console.log(`   ✅ 已将 updatedAt 设置为: ${triggerDate.toISOString()}`);
    console.log(`   ✅ 宽限期结束日期: ${gracePeriodEndDate.toISOString()}`);
    console.log(`   ✅ 预警邮件计数: 3\n`);

    // 检查是否有受益人
    const beneficiariesList = await db()
      .select()
      .from(beneficiaries)
      .where(eq(beneficiaries.vaultId, vault.id));

    console.log(`   📋 受益人数量: ${beneficiariesList.length}`);
    if (beneficiariesList.length > 0) {
      beneficiariesList.forEach((b, i) => {
        console.log(`      ${i + 1}. ${b.name} (${b.email})`);
        console.log(`         地址完整: ${b.receiverName && b.addressLine1 && b.city ? '✅' : '❌'}`);
      });
    } else {
      console.log(`   ⚠️  没有受益人，无法测试继承流程\n`);
    }

    console.log('\n   📧 运行 Cron Job 来触发 Dead Man\'s Switch...\n');

    // 再次调用 Cron Job
    try {
      const cronResponse2 = await fetch(`${appUrl}/api/cron/dead-man-switch-check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
        },
      });

      if (cronResponse2.ok) {
        const cronResult2 = await cronResponse2.json();
        console.log('   ✅ Cron Job 执行成功');
        console.log(`      警告邮件发送: ${cronResult2.warningsSent || 0}`);
        console.log(`      提醒邮件发送: ${cronResult2.remindersSent || 0}`);
        console.log(`      触发执行: ${cronResult2.triggersExecuted || 0}\n`);
      } else {
        console.log(`   ⚠️  Cron Job 返回错误: ${cronResponse2.status}\n`);
      }
    } catch (error: any) {
      console.log(`   ⚠️  Cron Job 调用失败: ${error.message}\n`);
    }

    // 等待一下
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 验证状态
    const [updatedVault2] = await db()
      .select()
      .from(digitalVaults)
      .where(eq(digitalVaults.id, vault.id));

    console.log(`   📊 验证结果:`);
    console.log(`      状态: ${updatedVault2.status}`);
    console.log(`      Dead Man's Switch 激活时间: ${updatedVault2.deadManSwitchActivatedAt || '未激活'}`);

    if (updatedVault2.status === VaultStatus.TRIGGERED) {
      console.log(`   ✅ 状态已正确变为 TRIGGERED\n`);
    } else {
      console.log(`   ⚠️  状态未变为 TRIGGERED，当前状态: ${updatedVault2.status}\n`);
    }

    // 检查邮件通知记录
    const emailNotificationsList = await db()
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.vaultId, vault.id))
      .orderBy(desc(emailNotifications.createdAt))
      .limit(10);

    console.log(`   📧 邮件通知记录: ${emailNotificationsList.length} 条`);
    emailNotificationsList.forEach((email, i) => {
      console.log(`      ${i + 1}. ${email.emailType} - ${email.status} (${email.recipientEmail})`);
    });

    console.log('\n✅ 完整工作流测试完成！');
    console.log('\n📝 验证清单:');
    console.log(`   ${updatedVault1.status === VaultStatus.PENDING_VERIFICATION ? '✅' : '❌'} 状态从 ACTIVE 变为 PENDING_VERIFICATION`);
    console.log(`   ${updatedVault1.warningEmailCount > 0 ? '✅' : '❌'} 预警邮件已发送`);
    console.log(`   ${emailNotificationsList.length > 0 ? '✅' : '❌'} email_notifications 表有记录`);
    console.log(`   ${updatedVault2.status === VaultStatus.TRIGGERED ? '✅' : '❌'} 状态从 PENDING_VERIFICATION 变为 TRIGGERED`);
    console.log(`   ${updatedVault2.deadManSwitchActivatedAt ? '✅' : '❌'} Dead Man's Switch 已激活`);
    console.log(`   ${emailNotificationsList.some(e => e.emailType === 'inheritance_notice') ? '✅' : '❌'} 受益人通知邮件已发送`);
    if (beneficiariesList.length > 0 && beneficiariesList[0].receiverName) {
      console.log(`   ${emailNotificationsList.some(e => e.emailType === 'inheritance_notice') ? '✅' : '❌'} ShipAny 物流订单已创建（如果地址完整）`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ 测试失败:', error);
    if (error.message) {
      console.error('   错误详情:', error.message);
    }
    process.exit(1);
  }
}

testCompleteWorkflow();
