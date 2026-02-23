/**
 * Vercel 环境变量配置指南
 * 项目: soloboard-command-center-b
 * 域名: https://soloboard-command-center-b.vercel.app
 */

console.log('📋 Vercel 环境变量配置清单\n');
console.log('项目: soloboard-command-center-b');
console.log('域名: https://soloboard-command-center-b.vercel.app\n');
console.log('═══════════════════════════════════════════════════════\n');

const requiredEnvVars = [
  {
    key: 'DATABASE_URL',
    value: '你的 Neon PostgreSQL 连接字符串',
    description: '数据库连接 URL',
    example: 'postgresql://user:password@host/database?sslmode=require',
    environments: ['Production', 'Preview', 'Development']
  },
  {
    key: 'AUTH_SECRET',
    value: 'WFS7lg7JDLR4RYRBh8cSK7RwsFVfhPuB87JYGp5JleA=',
    description: 'Better Auth 密钥',
    environments: ['Production', 'Preview', 'Development']
  },
  {
    key: 'AUTH_URL',
    value: 'https://soloboard-command-center-b.vercel.app',
    description: 'Better Auth 基础 URL（重要！必须匹配部署域名）',
    environments: ['Production', 'Preview', 'Development']
  },
  {
    key: 'NEXT_PUBLIC_APP_URL',
    value: 'https://soloboard-command-center-b.vercel.app',
    description: '应用公开 URL（重要！必须匹配部署域名）',
    environments: ['Production', 'Preview', 'Development']
  },
  {
    key: 'ENCRYPTION_KEY',
    value: '+GzfvXVFt2HFVY0PzU1YcaY74exEdOMO/Mp7mPH8sxI=',
    description: '数据加密密钥',
    environments: ['Production', 'Preview', 'Development']
  },
  {
    key: 'CRON_SECRET',
    value: '+GzfvXVFt2HFVY0PzU1YcaY74exEdOMO/Mp7mPH8sxI=',
    description: 'Cron Job 密钥',
    environments: ['Production', 'Preview', 'Development']
  },
  {
    key: 'QSTASH_CURRENT_SIGNING_KEY',
    value: '从 Upstash QStash 获取',
    description: 'QStash 当前签名密钥',
    environments: ['Production', 'Preview', 'Development']
  },
  {
    key: 'QSTASH_NEXT_SIGNING_KEY',
    value: '从 Upstash QStash 获取',
    description: 'QStash 下一个签名密钥',
    environments: ['Production', 'Preview', 'Development']
  },
  {
    key: 'DATABASE_PROVIDER',
    value: 'postgresql',
    description: '数据库类型',
    environments: ['Production', 'Preview', 'Development']
  }
];

console.log('🔧 需要配置的环境变量:\n');

requiredEnvVars.forEach((env, index) => {
  console.log(`${index + 1}. ${env.key}`);
  console.log(`   描述: ${env.description}`);
  console.log(`   值: ${env.value}`);
  console.log(`   环境: ${env.environments.join(', ')}`);
  if (env.example) {
    console.log(`   示例: ${env.example}`);
  }
  console.log('');
});

console.log('═══════════════════════════════════════════════════════\n');
console.log('📝 配置步骤:\n');
console.log('方法 1: 使用 Vercel CLI (推荐)\n');

requiredEnvVars.forEach((env) => {
  console.log(`vercel env add ${env.key} production`);
  console.log(`# 输入: ${env.value}`);
  console.log('');
});

console.log('\n方法 2: 使用 Vercel Dashboard\n');
console.log('1. 访问: https://vercel.com/dashboard');
console.log('2. 选择项目: soloboard-command-center-b');
console.log('3. 进入: Settings > Environment Variables');
console.log('4. 逐个添加上述环境变量');
console.log('5. 确保选择所有环境: Production, Preview, Development');
console.log('6. 保存后点击 "Redeploy" 重新部署\n');

console.log('═══════════════════════════════════════════════════════\n');
console.log('⚠️  重要提示:\n');
console.log('1. AUTH_URL 和 NEXT_PUBLIC_APP_URL 必须设置为:');
console.log('   https://soloboard-command-center-b.vercel.app');
console.log('');
console.log('2. 如果设置错误会导致 CORS 错误');
console.log('');
console.log('3. 配置完成后必须重新部署才能生效');
console.log('');
console.log('4. DATABASE_URL 需要从你的 Neon 控制台获取');
console.log('');
console.log('5. QSTASH 密钥需要从 Upstash 控制台获取');
console.log('   访问: https://console.upstash.com/qstash');
console.log('');
console.log('═══════════════════════════════════════════════════════\n');

console.log('🚀 配置完成后运行:\n');
console.log('vercel --prod\n');
console.log('或在 Vercel Dashboard 点击 "Redeploy"\n');


