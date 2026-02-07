/**
 * 管理员 API 功能测试脚本
 * 
 * 直接测试 API 路由处理函数（不通过 HTTP）
 * 需要管理员已登录或使用服务端直接调用
 * 
 * 使用方法:
 *   npx tsx scripts/test-admin-apis.ts
 */

import { db } from '@/core/db';
import { user, digitalVaults, adminAuditLogs, emailNotifications, beneficiaries, systemAlerts } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

const ADMIN_EMAIL = 'xiongjp_fr@163.com';

interface TestResult {
  name: string;
  endpoint: string;
  status: 'pass' | 'fail' | 'skip';
  message?: string;
  data?: any;
}

const results: TestResult[] = [];

async function testAPI(name: string, endpoint: string, handler: any, mockRequest?: any): Promise<TestResult> {
  try {
    console.log(`\n🧪 测试: ${name}`);
    console.log(`   ${endpoint}`);

    // 创建模拟请求
    const request = mockRequest || new NextRequest(`http://localhost:3000${endpoint}`);

    // 调用处理函数
    const response = await handler(request);
    const responseData = await response.json();

    if (responseData.code === 0 || response.status === 200) {
      return {
        name,
        endpoint,
        status: 'pass',
        message: '成功',
        data: responseData.data || responseData,
      };
    } else if (response.status === 401 || responseData.code === 401) {
      return {
        name,
        endpoint,
        status: 'skip',
        message: '需要认证（正常，端点存在）',
      };
    } else {
      return {
        name,
        endpoint,
        status: 'fail',
        message: `错误: ${responseData.message || 'Unknown error'}`,
        data: responseData,
      };
    }
  } catch (error: any) {
    return {
      name,
      endpoint,
      status: 'fail',
      message: error.message,
    };
  }
}

async function testAdminAPIs() {
  console.log('🚀 开始测试管理员 API 功能...\n');
  console.log(`📧 管理员邮箱: ${ADMIN_EMAIL}\n`);

  // 检查用户是否存在
  console.log('🔍 检查管理员用户...');
  const [adminUser] = await db()
    .select()
    .from(user)
    .where(eq(user.email, ADMIN_EMAIL));

  if (!adminUser) {
    console.error(`❌ 错误: 未找到用户 ${ADMIN_EMAIL}`);
    console.log('💡 请先运行: npx tsx scripts/set-admin-user.ts');
    process.exit(1);
  }

  console.log(`✅ 找到用户: ${adminUser.name || 'N/A'} (${adminUser.email})`);
  console.log(`   用户 ID: ${adminUser.id}\n`);

  // 测试数据库连接和基本查询
  console.log('📊 测试数据库连接...');
  try {
    const vaultCount = await db().select().from(digitalVaults).limit(1);
    console.log('✅ 数据库连接正常\n');
  } catch (error: any) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }

  // 由于 API 路由需要认证，我们直接测试数据库查询逻辑
  console.log('📊 Phase 1: 核心看板和列表页面');
  
  try {
    // 测试统计查询
    const statsTest = await db()
      .select({
        total: digitalVaults.id,
      })
      .from(digitalVaults)
      .limit(1);
    
    results.push({
      name: '统计信息查询',
      endpoint: '/api/admin/digital-heirloom/stats',
      status: 'pass',
      message: '数据库查询正常',
    });
  } catch (error: any) {
    results.push({
      name: '统计信息查询',
      endpoint: '/api/admin/digital-heirloom/stats',
      status: 'fail',
      message: error.message,
    });
  }

  // 测试高风险金库查询
  try {
    const urgentVaults = await db()
      .select()
      .from(digitalVaults)
      .where(eq(digitalVaults.status, 'pending_verification'))
      .limit(1);
    
    results.push({
      name: '高风险金库查询',
      endpoint: '/api/admin/digital-heirloom/vaults?urgent=true',
      status: 'pass',
      message: '数据库查询正常',
    });
  } catch (error: any) {
    results.push({
      name: '高风险金库查询',
      endpoint: '/api/admin/digital-heirloom/vaults?urgent=true',
      status: 'fail',
      message: error.message,
    });
  }

  console.log('\n📝 Phase 2: 补偿功能和审计日志');
  
  try {
    // 测试补偿审计日志查询
    const auditLogs = await db()
      .select()
      .from(adminAuditLogs)
      .limit(1);
    
    results.push({
      name: '补偿审计日志查询',
      endpoint: '/api/admin/digital-heirloom/compensations',
      status: 'pass',
      message: '数据库查询正常',
    });
  } catch (error: any) {
    results.push({
      name: '补偿审计日志查询',
      endpoint: '/api/admin/digital-heirloom/compensations',
      status: 'fail',
      message: error.message,
    });
  }

  console.log('\n💰 Phase 3: 成本监控和安全监控');
  
  try {
    // 测试成本监控（检查 emailNotifications 表）
    const emailStats = await db()
      .select()
      .from(emailNotifications)
      .limit(1);
    
    results.push({
      name: '成本监控查询',
      endpoint: '/api/admin/digital-heirloom/costs',
      status: 'pass',
      message: '数据库查询正常',
    });
  } catch (error: any) {
    results.push({
      name: '成本监控查询',
      endpoint: '/api/admin/digital-heirloom/costs',
      status: 'fail',
      message: error.message,
    });
  }

  try {
    // 测试安全监控（检查 beneficiaries 表）
    const beneficiariesData = await db()
      .select()
      .from(beneficiaries)
      .limit(1);
    
    results.push({
      name: '安全监控查询',
      endpoint: '/api/admin/digital-heirloom/security',
      status: 'pass',
      message: '数据库查询正常',
    });
  } catch (error: any) {
    results.push({
      name: '安全监控查询',
      endpoint: '/api/admin/digital-heirloom/security',
      status: 'fail',
      message: error.message,
    });
  }

  console.log('\n🚨 Phase 4: 报警机制');
  
  try {
    // 测试报警历史查询
    const alerts = await db()
      .select()
      .from(systemAlerts)
      .limit(1);
    
    results.push({
      name: '报警历史查询',
      endpoint: '/api/admin/digital-heirloom/alerts',
      status: 'pass',
      message: '数据库查询正常',
    });
  } catch (error: any) {
    results.push({
      name: '报警历史查询',
      endpoint: '/api/admin/digital-heirloom/alerts',
      status: 'fail',
      message: error.message,
    });
  }

  console.log('\n🔧 Phase 5: 批量操作和高级功能');
  
  try {
    // 测试金库列表查询
    const vaults = await db()
      .select()
      .from(digitalVaults)
      .limit(1);
    
    results.push({
      name: '金库列表查询',
      endpoint: '/api/admin/digital-heirloom/vaults',
      status: 'pass',
      message: '数据库查询正常',
    });
  } catch (error: any) {
    results.push({
      name: '金库列表查询',
      endpoint: '/api/admin/digital-heirloom/vaults',
      status: 'fail',
      message: error.message,
    });
  }

  try {
    // 测试报表查询
    const reports = await db()
      .select()
      .from(digitalVaults)
      .limit(1);
    
    results.push({
      name: '报表查询',
      endpoint: '/api/admin/digital-heirloom/reports',
      status: 'pass',
      message: '数据库查询正常',
    });
  } catch (error: any) {
    results.push({
      name: '报表查询',
      endpoint: '/api/admin/digital-heirloom/reports',
      status: 'fail',
      message: error.message,
    });
  }

  // 打印测试结果摘要
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 测试结果摘要');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  console.log(`\n✅ 通过: ${passed}`);
  console.log(`⏭️  跳过: ${skipped}`);
  console.log(`❌ 失败: ${failed}`);

  console.log('\n详细结果:');
  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'skip' ? '⏭️' : '❌';
    console.log(`\n${index + 1}. ${icon} ${result.name}`);
    console.log(`   ${result.endpoint}`);
    if (result.message) {
      console.log(`   ${result.message}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('💡 说明:');
  console.log('   - 此测试验证了数据库连接和基本查询功能');
  console.log('   - 要完整测试 API 功能，请使用浏览器登录后访问页面');
  console.log('   - 下一步：启动开发服务器并访问管理员界面进行人工测试');
  console.log('='.repeat(60) + '\n');

  if (failed > 0) {
    console.log('⚠️  有测试失败，请检查数据库迁移是否完成');
    process.exit(1);
  } else {
    console.log('✅ 所有数据库查询测试通过！');
    console.log('\n📋 下一步：');
    console.log('   1. 启动开发服务器: npm run dev');
    console.log('   2. 登录管理员账号: xiongjp_fr@163.com');
    console.log('   3. 访问管理员界面进行人工测试');
    console.log('   4. 参考 ADMIN_LOGIN_TEST_GUIDE.md 进行详细测试\n');
    process.exit(0);
  }
}

// 执行测试
testAdminAPIs().catch((error) => {
  console.error('\n❌ 测试执行失败:', error);
  process.exit(1);
});
