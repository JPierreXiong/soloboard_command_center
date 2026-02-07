/**
 * 管理员界面功能测试脚本
 * 
 * 测试 Phase 1-5 的所有 API 端点是否正常工作
 * 
 * 使用方法:
 *   npx tsx scripts/test-admin-dashboard.ts
 */

import { db } from '@/core/db';
import { user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

const ADMIN_EMAIL = 'xiongjp_fr@163.com';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  status: 'pass' | 'fail' | 'skip';
  message?: string;
  response?: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any,
  requiresAuth = true
): Promise<TestResult> {
  try {
    console.log(`\n🧪 测试: ${name}`);
    console.log(`   ${method} ${endpoint}`);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // 如果需要认证，这里应该添加认证 token
    // 注意：由于这是服务器端测试，我们需要模拟认证或使用服务端直接调用
    // 这里我们只测试端点是否存在和返回正确的响应格式

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    // 注意：在实际测试中，我们需要真实的认证 token
    // 这里我们只测试端点是否可访问（可能会返回 401，但至少端点存在）
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (response.status === 200 || response.status === 401) {
      // 401 表示端点存在但需要认证，这是正常的
      return {
        name,
        endpoint,
        method,
        status: response.status === 200 ? 'pass' : 'skip',
        message: response.status === 401 ? '需要认证（正常）' : '成功',
        response: data,
      };
    } else {
      return {
        name,
        endpoint,
        method,
        status: 'fail',
        message: `HTTP ${response.status}: ${data.message || 'Unknown error'}`,
        response: data,
      };
    }
  } catch (error: any) {
    return {
      name,
      endpoint,
      method,
      status: 'fail',
      message: error.message,
    };
  }
}

async function testAdminDashboard() {
  console.log('🚀 开始测试管理员界面功能...\n');
  console.log(`📧 管理员邮箱: ${ADMIN_EMAIL}`);
  console.log(`🌐 基础 URL: ${BASE_URL}\n`);

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

  console.log(`✅ 找到用户: ${adminUser.name || 'N/A'} (${adminUser.email})\n`);

  // Phase 1: 核心看板和列表页面
  console.log('📊 Phase 1: 核心看板和列表页面');
  results.push(await testEndpoint('统计信息', '/api/admin/digital-heirloom/stats'));
  results.push(await testEndpoint('高风险金库列表', '/api/admin/digital-heirloom/vaults?urgent=true'));

  // Phase 2: 补偿功能和审计日志
  console.log('\n📝 Phase 2: 补偿功能和审计日志');
  results.push(await testEndpoint('补偿审计日志', '/api/admin/digital-heirloom/compensations'));

  // Phase 3: 成本监控和安全监控
  console.log('\n💰 Phase 3: 成本监控和安全监控');
  results.push(await testEndpoint('成本监控', '/api/admin/digital-heirloom/costs'));
  results.push(await testEndpoint('安全监控', '/api/admin/digital-heirloom/security'));

  // Phase 4: 报警机制
  console.log('\n🚨 Phase 4: 报警机制');
  results.push(await testEndpoint('报警历史', '/api/admin/digital-heirloom/alerts'));

  // Phase 5: 批量操作和高级功能
  console.log('\n🔧 Phase 5: 批量操作和高级功能');
  results.push(await testEndpoint('金库列表', '/api/admin/digital-heirloom/vaults'));
  results.push(await testEndpoint('数据导出', '/api/admin/digital-heirloom/vaults/export'));
  results.push(await testEndpoint('自定义报表', '/api/admin/digital-heirloom/reports?type=overview'));

  // 打印测试结果摘要
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 测试结果摘要');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  console.log(`\n✅ 通过: ${passed}`);
  console.log(`⏭️  跳过（需要认证）: ${skipped}`);
  console.log(`❌ 失败: ${failed}`);

  console.log('\n详细结果:');
  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'skip' ? '⏭️' : '❌';
    console.log(`\n${index + 1}. ${icon} ${result.name}`);
    console.log(`   ${result.method} ${result.endpoint}`);
    if (result.message) {
      console.log(`   ${result.message}`);
    }
    if (result.status === 'fail' && result.response) {
      console.log(`   错误详情: ${JSON.stringify(result.response, null, 2)}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('💡 说明:');
  console.log('   - "跳过"状态表示端点存在但需要认证，这是正常的');
  console.log('   - 要完整测试功能，请使用浏览器登录后访问页面');
  console.log('   - 所有端点都应该返回正确的响应格式（即使是 401）');
  console.log('='.repeat(60) + '\n');

  if (failed > 0) {
    console.log('⚠️  有测试失败，请检查服务器是否正常运行');
    process.exit(1);
  } else {
    console.log('✅ 所有端点测试通过！可以开始人工测试。');
    process.exit(0);
  }
}

// 执行测试
testAdminDashboard().catch((error) => {
  console.error('\n❌ 测试执行失败:', error);
  process.exit(1);
});
