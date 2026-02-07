/**
 * 管理员功能简单测试脚本
 * 
 * 测试数据库连接和基本查询功能
 */

import { db } from '@/core/db';
import { user, digitalVaults, adminAuditLogs, emailNotifications, beneficiaries, systemAlerts } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

const ADMIN_EMAIL = 'xiongjp_fr@163.com';

async function testAdminSimple() {
  console.log('🚀 开始测试管理员功能...\n');

  try {
    // 1. 检查用户
    console.log('🔍 检查管理员用户...');
    const [adminUser] = await db()
      .select()
      .from(user)
      .where(eq(user.email, ADMIN_EMAIL));

    if (!adminUser) {
      console.error(`❌ 未找到用户: ${ADMIN_EMAIL}`);
      return;
    }
    console.log(`✅ 找到用户: ${adminUser.name || 'N/A'} (${adminUser.email})\n`);

    // 2. 测试数据库表查询
    console.log('📊 测试数据库表查询...\n');

    // digital_vaults
    try {
      const vaults = await db().select().from(digitalVaults).limit(1);
      console.log('✅ digital_vaults 表查询正常');
    } catch (error: any) {
      console.log(`❌ digital_vaults 表查询失败: ${error.message}`);
    }

    // admin_audit_logs
    try {
      const logs = await db().select().from(adminAuditLogs).limit(1);
      console.log('✅ admin_audit_logs 表查询正常');
    } catch (error: any) {
      console.log(`❌ admin_audit_logs 表查询失败: ${error.message}`);
    }

    // email_notifications
    try {
      const emails = await db().select().from(emailNotifications).limit(1);
      console.log('✅ email_notifications 表查询正常');
    } catch (error: any) {
      console.log(`❌ email_notifications 表查询失败: ${error.message}`);
    }

    // beneficiaries
    try {
      const bens = await db().select().from(beneficiaries).limit(1);
      console.log('✅ beneficiaries 表查询正常');
    } catch (error: any) {
      console.log(`❌ beneficiaries 表查询失败: ${error.message}`);
    }

    // system_alerts
    try {
      const alerts = await db().select().from(systemAlerts).limit(1);
      console.log('✅ system_alerts 表查询正常');
    } catch (error: any) {
      console.log(`❌ system_alerts 表查询失败: ${error.message}`);
    }

    console.log('\n✅ 所有数据库表测试完成！');
    console.log('\n📋 下一步：');
    console.log('   1. 启动开发服务器: npm run dev');
    console.log('   2. 登录管理员账号: xiongjp_fr@163.com');
    console.log('   3. 访问 http://localhost:3000/admin/digital-heirloom');
    console.log('   4. 参考 ADMIN_LOGIN_TEST_GUIDE.md 进行详细测试\n');

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testAdminSimple();
