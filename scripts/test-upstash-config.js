#!/usr/bin/env node

/**
 * Upstash QStash 配置测试脚本
 * 
 * 用途：验证 Cron API 是否正常工作
 */

const CRON_SECRET = 'lHyTB7k7gxkcrWbWFSoNZk9IKy6d1ETWRrUOv3tcQGg=';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testCronEndpoint(baseUrl) {
  const url = `${baseUrl}/api/cron/sync-sites`;
  
  log('\n🚀 开始测试 Cron API 端点...', 'cyan');
  log(`📍 URL: ${url}`, 'blue');
  log(`🔑 Secret: ${CRON_SECRET.substring(0, 20)}...`, 'blue');
  
  try {
    log('\n⏳ 发送请求...', 'yellow');
    
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    log(`\n⏱️  响应时间: ${duration}ms`, 'blue');
    log(`📊 状态码: ${response.status}`, response.status === 200 ? 'green' : 'red');
    
    if (response.status === 200) {
      log('\n✅ 测试成功！', 'green');
      log('\n📦 响应数据:', 'cyan');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.success) {
        log('\n🎉 同步完成！', 'green');
        log(`   - 总站点数: ${data.result?.total || 0}`, 'green');
        log(`   - 成功: ${data.result?.success || 0}`, 'green');
        log(`   - 失败: ${data.result?.failed || 0}`, 'green');
        log(`   - 耗时: ${data.result?.duration || 0}ms`, 'green');
      }
      
      return true;
    } else {
      log('\n❌ 测试失败！', 'red');
      log('\n📦 错误响应:', 'red');
      console.log(JSON.stringify(data, null, 2));
      
      if (response.status === 401) {
        log('\n💡 提示: 请检查 CRON_SECRET 是否正确', 'yellow');
        log('   1. 检查 .env.local 文件', 'yellow');
        log('   2. 检查 Vercel 环境变量', 'yellow');
        log('   3. 确保 Upstash Headers 配置正确', 'yellow');
      }
      
      return false;
    }
  } catch (error) {
    log('\n❌ 请求失败！', 'red');
    log(`错误信息: ${error.message}`, 'red');
    
    if (error.message.includes('fetch failed')) {
      log('\n💡 提示: 请检查网络连接或 URL 是否正确', 'yellow');
    }
    
    return false;
  }
}

async function main() {
  log('╔════════════════════════════════════════════╗', 'cyan');
  log('║   Upstash QStash 配置测试工具              ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  
  // 从命令行参数获取 URL，或使用默认值
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  
  log(`\n🌐 测试环境: ${baseUrl}`, 'blue');
  
  if (baseUrl.includes('localhost')) {
    log('\n⚠️  注意: 正在测试本地环境', 'yellow');
    log('   请确保已运行: npm run dev', 'yellow');
  } else {
    log('\n🌍 正在测试生产环境', 'green');
  }
  
  const success = await testCronEndpoint(baseUrl);
  
  if (success) {
    log('\n╔════════════════════════════════════════════╗', 'green');
    log('║   ✅ 所有测试通过！                        ║', 'green');
    log('╚════════════════════════════════════════════╝', 'green');
    
    log('\n📋 下一步操作:', 'cyan');
    log('   1. 在 Upstash QStash 中配置定时任务', 'blue');
    log('   2. 使用相同的 URL 和 Authorization Header', 'blue');
    log('   3. 设置 Cron 表达式: */15 * * * *', 'blue');
    log('   4. 保存并测试', 'blue');
    
    process.exit(0);
  } else {
    log('\n╔════════════════════════════════════════════╗', 'red');
    log('║   ❌ 测试失败，请检查配置                  ║', 'red');
    log('╚════════════════════════════════════════════╝', 'red');
    
    log('\n📋 故障排查步骤:', 'cyan');
    log('   1. 检查 .env.local 中的 CRON_SECRET', 'yellow');
    log('   2. 确保数据库连接正常', 'yellow');
    log('   3. 查看详细错误日志', 'yellow');
    log('   4. 尝试重启开发服务器', 'yellow');
    
    process.exit(1);
  }
}

// 运行测试
main().catch((error) => {
  log('\n💥 未预期的错误:', 'red');
  console.error(error);
  process.exit(1);
});

