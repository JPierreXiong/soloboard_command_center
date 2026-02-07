/**
 * 测试 Cron Job: Dead Man's Switch 检查
 * 运行方式: npx tsx scripts/test-cron-job.ts
 * 
 * 注意: 需要设置环境变量
 * - DATABASE_URL
 * - RESEND_API_KEY
 * - SHIPANY_API_KEY (可选，如果测试物流功能)
 * - VERCEL_CRON_SECRET (可选，用于测试认证)
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env.development') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function testCronJob() {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const cronSecret = process.env.VERCEL_CRON_SECRET || process.env.CRON_SECRET;

    console.log('🧪 Testing Cron Job...\n');
    console.log(`URL: ${appUrl}/api/cron/dead-man-switch-check`);
    console.log(`Secret: ${cronSecret ? '***' : 'Not set'}\n`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cronSecret) {
      headers['Authorization'] = `Bearer ${cronSecret}`;
    }

    const response = await fetch(`${appUrl}/api/cron/dead-man-switch-check`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Cron Job failed:');
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log('✅ Cron Job executed successfully:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n📊 Summary:');
    console.log(`  - Warnings sent: ${data.warningsSent || 0}`);
    console.log(`  - Reminders sent: ${data.remindersSent || 0}`);
    console.log(`  - Triggers executed: ${data.triggersExecuted || 0}`);
    console.log(`  - Errors: ${data.errors?.length || 0}`);
    if (data.errors && data.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      data.errors.forEach((error: string) => {
        console.log(`  - ${error}`);
      });
    }
    console.log(`\n⏱️  Duration: ${data.duration || 0}ms`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testCronJob();
