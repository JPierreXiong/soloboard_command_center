/**
 * 测试邮件发送服务
 * 运行方式: npx tsx scripts/test-email-service.ts
 * 
 * 注意: 需要设置环境变量
 * - RESEND_API_KEY
 * - RESEND_SENDER_EMAIL
 * - NEXT_PUBLIC_APP_URL
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env.development') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { getUuid } from '@/shared/lib/hash';
import {
  sendHeartbeatWarningEmail,
  sendHeartbeatReminderEmail,
  sendInheritanceNoticeEmail,
} from '@/shared/services/digital-heirloom/email-service';

async function testEmailService() {
  try {
    console.log('🧪 Testing Email Service...\n');

    // 测试邮箱（请替换为您的测试邮箱）
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const testVaultId = getUuid();
    const testToken = getUuid();

    console.log(`Test email: ${testEmail}`);
    console.log(`Test vault ID: ${testVaultId}\n`);

    // 测试 1: 预警邮件
    console.log('1️⃣ Testing heartbeat warning email...');
    const warningResult = await sendHeartbeatWarningEmail(
      testVaultId,
      testEmail,
      'Test User',
      95,
      90,
      7,
      testToken,
      'en'
    );
    console.log(`   Result: ${warningResult.success ? '✅ Success' : '❌ Failed'}`);
    if (warningResult.messageId) {
      console.log(`   Message ID: ${warningResult.messageId}`);
    }
    if (warningResult.error) {
      console.log(`   Error: ${warningResult.error}`);
    }
    console.log('');

    // 等待一下，避免速率限制
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 测试 2: 提醒邮件
    console.log('2️⃣ Testing heartbeat reminder email...');
    const reminderResult = await sendHeartbeatReminderEmail(
      testVaultId,
      testEmail,
      'Test User',
      97,
      12,
      testToken,
      'en'
    );
    console.log(`   Result: ${reminderResult.success ? '✅ Success' : '❌ Failed'}`);
    if (reminderResult.messageId) {
      console.log(`   Message ID: ${reminderResult.messageId}`);
    }
    if (reminderResult.error) {
      console.log(`   Error: ${reminderResult.error}`);
    }
    console.log('');

    // 等待一下
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 测试 3: 继承通知邮件
    console.log('3️⃣ Testing inheritance notice email...');
    const inheritanceResult = await sendInheritanceNoticeEmail(
      testVaultId,
      testEmail,
      'Test Beneficiary',
      'Test User',
      getUuid(),
      undefined,
      undefined,
      'en'
    );
    console.log(`   Result: ${inheritanceResult.success ? '✅ Success' : '❌ Failed'}`);
    if (inheritanceResult.messageId) {
      console.log(`   Message ID: ${inheritanceResult.messageId}`);
    }
    if (inheritanceResult.error) {
      console.log(`   Error: ${inheritanceResult.error}`);
    }
    console.log('');

    console.log('✅ Email service test completed!');
    console.log('\n📧 Please check your email inbox for the test emails.');
    console.log('   Note: Emails may take a few minutes to arrive.');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testEmailService();
