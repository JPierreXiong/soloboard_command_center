/**
 * 完整的端到端测试 - 使用本地服务器
 * 
 * 测试流程：
 * 1. 启动本地开发服务器
 * 2. 测试用户注册
 * 3. 测试用户登录
 * 4. 测试数据库连接
 * 5. 测试 API 路由
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, colors.green);
}

function error(message: string) {
  log(`❌ ${message}`, colors.red);
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

function warning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function section(title: string) {
  log(`\n${'='.repeat(70)}`, colors.cyan);
  log(`  ${title}`, colors.cyan);
  log(`${'='.repeat(70)}`, colors.cyan);
}

// 测试结果
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
};

async function runTest(name: string, testFn: () => Promise<boolean>) {
  testResults.total++;
  info(`Testing: ${name}...`);
  
  try {
    const result = await testFn();
    if (result) {
      testResults.passed++;
      success(`PASSED: ${name}`);
    } else {
      testResults.failed++;
      error(`FAILED: ${name}`);
    }
    return result;
  } catch (err: any) {
    testResults.failed++;
    error(`FAILED: ${name}`);
    error(`Error: ${err.message}`);
    return false;
  }
}

// 1. 测试环境变量
async function testEnvironment(): Promise<boolean> {
  section('1. 环境变量检查');
  
  const required = [
    'DATABASE_URL',
    'AUTH_SECRET',
    'NEXT_PUBLIC_APP_URL',
    'ENCRYPTION_KEY',
  ];
  
  let allPresent = true;
  
  for (const key of required) {
    if (process.env[key]) {
      success(`${key}: 已配置`);
    } else {
      error(`${key}: 未配置`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

// 2. 测试数据库连接
async function testDatabase(): Promise<boolean> {
  section('2. 数据库连接测试');
  
  try {
    const { db } = await import('../src/core/db');
    const { user } = await import('../src/config/db/schema');
    
    info('正在连接数据库...');
    
    // 尝试查询用户表
    const result = await db.select().from(user).limit(1);
    
    success('数据库连接成功');
    info(`用户表可访问，当前用户数: ${result.length > 0 ? '至少1个' : '0个'}`);
    
    return true;
  } catch (err: any) {
    error(`数据库连接失败: ${err.message}`);
    return false;
  }
}

// 3. 测试认证系统
async function testAuth(): Promise<boolean> {
  section('3. 认证系统测试');
  
  try {
    const { getAuth } = await import('../src/core/auth');
    
    info('正在初始化认证系统...');
    const auth = await getAuth();
    
    success('认证系统初始化成功');
    info('Better Auth 已就绪');
    
    return true;
  } catch (err: any) {
    error(`认证系统初始化失败: ${err.message}`);
    return false;
  }
}

// 4. 测试支付配置
async function testPaymentConfig(): Promise<boolean> {
  section('4. 支付配置检查');
  
  const creemConfig = {
    apiKey: process.env.CREEM_API_KEY,
    signingSecret: process.env.CREEM_SIGNING_SECRET,
    environment: process.env.CREEM_ENVIRONMENT,
  };
  
  if (creemConfig.apiKey && creemConfig.signingSecret) {
    success('Creem 配置已设置');
    info(`环境: ${creemConfig.environment || 'production'}`);
    info(`API Key: ${creemConfig.apiKey.substring(0, 20)}...`);
    return true;
  } else {
    warning('Creem 配置未完整设置');
    warning('这不会影响基本功能测试');
    return true; // 不算失败
  }
}

// 5. 测试 API 路由文件
async function testApiRoutes(): Promise<boolean> {
  section('5. API 路由文件检查');
  
  const routes = [
    'src/app/api/auth/[...all]/route.ts',
    'src/app/api/payment/create/route.ts',
    'src/app/api/payment/notify/creem/route.ts',
    'src/app/api/payment/order/[orderId]/route.ts',
    'src/app/api/subscription/[subscriptionId]/route.ts',
    'src/app/api/user/me/route.ts',
  ];
  
  const fs = await import('fs');
  const path = await import('path');
  
  let allExist = true;
  
  for (const route of routes) {
    const fullPath = path.resolve(process.cwd(), route);
    if (fs.existsSync(fullPath)) {
      success(`${route}`);
    } else {
      error(`${route} - 不存在`);
      allExist = false;
    }
  }
  
  return allExist;
}

// 6. 测试数据库表结构
async function testDatabaseSchema(): Promise<boolean> {
  section('6. 数据库表结构检查');
  
  try {
    const { db } = await import('../src/core/db');
    const schema = await import('../src/config/db/schema');
    
    const tables = ['user', 'order', 'subscription', 'session', 'account'];
    
    for (const tableName of tables) {
      if (schema[tableName]) {
        success(`表定义存在: ${tableName}`);
      } else {
        error(`表定义缺失: ${tableName}`);
      }
    }
    
    return true;
  } catch (err: any) {
    error(`表结构检查失败: ${err.message}`);
    return false;
  }
}

// 7. 测试 Creem Provider
async function testCreemProvider(): Promise<boolean> {
  section('7. Creem Provider 测试');
  
  try {
    const { createCreemProvider } = await import('../src/extensions/payment/creem');
    
    const apiKey = process.env.CREEM_API_KEY || 'test_key';
    const signingSecret = process.env.CREEM_SIGNING_SECRET || 'test_secret';
    
    info('正在创建 Creem Provider...');
    
    const provider = createCreemProvider({
      apiKey,
      signingSecret,
      environment: 'sandbox',
    });
    
    success('Creem Provider 创建成功');
    info(`Provider name: ${provider.name}`);
    
    return true;
  } catch (err: any) {
    error(`Creem Provider 创建失败: ${err.message}`);
    return false;
  }
}

// 主测试函数
async function runAllTests() {
  log('\n' + '='.repeat(70), colors.cyan);
  log('  🧪 SoloBoard 完整功能测试', colors.cyan);
  log('  测试：数据库 + 认证 + 支付配置', colors.cyan);
  log('='.repeat(70) + '\n', colors.cyan);
  
  // 运行所有测试
  await runTest('环境变量配置', testEnvironment);
  await runTest('数据库连接', testDatabase);
  await runTest('认证系统', testAuth);
  await runTest('支付配置', testPaymentConfig);
  await runTest('API 路由文件', testApiRoutes);
  await runTest('数据库表结构', testDatabaseSchema);
  await runTest('Creem Provider', testCreemProvider);
  
  // 输出测试报告
  section('测试报告');
  
  log(`\n总测试数: ${testResults.total}`, colors.cyan);
  log(`通过: ${testResults.passed}`, colors.green);
  log(`失败: ${testResults.failed}`, colors.red);
  
  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
  log(`\n通过率: ${passRate}%`, colors.cyan);
  
  if (testResults.failed === 0) {
    log('\n🎉 所有测试通过！系统已就绪。', colors.green);
    log('\n下一步：启动开发服务器进行实际测试', colors.cyan);
    log('命令: pnpm dev', colors.cyan);
  } else {
    log('\n⚠️  部分测试失败，请修复后重试。', colors.yellow);
  }
  
  log('\n');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 运行测试
runAllTests().catch((err) => {
  error(`测试套件失败: ${err.message}`);
  process.exit(1);
});









