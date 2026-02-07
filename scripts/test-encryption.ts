#!/usr/bin/env node

/**
 * SoloBoard - 测试加密功能
 * 
 * 用于验证加密/解密是否正常工作
 * 
 * 使用方法：
 * pnpm tsx scripts/test-encryption.ts
 */

import { 
  encryptSiteConfigObject, 
  decryptSiteConfigObject,
  validateEncryptionKey,
  type SiteApiConfig 
} from '../src/shared/lib/site-crypto';

console.log('🔐 SoloBoard - 加密功能测试\n');
console.log('=' .repeat(60));

// 1. 验证加密密钥
console.log('\n📋 步骤 1: 验证加密密钥...');
const isKeyValid = validateEncryptionKey();

if (!isKeyValid) {
  console.error('❌ 错误: ENCRYPTION_KEY 未配置或格式不正确');
  console.error('   请在 .env.local 中配置 ENCRYPTION_KEY');
  console.error('   生成命令: openssl rand -base64 32\n');
  process.exit(1);
}

console.log('✅ 加密密钥验证通过');

// 2. 测试加密/解密
console.log('\n📋 步骤 2: 测试加密/解密...');

const testConfig: SiteApiConfig = {
  stripe: {
    secretKey: 'sk_test_1234567890abcdefghijklmnop',
    publishableKey: 'pk_test_1234567890abcdefghijklmnop',
  },
  ga4: {
    propertyId: '123456789',
    credentials: JSON.stringify({
      type: 'service_account',
      project_id: 'test-project',
      private_key_id: 'test-key-id',
      private_key: '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----\n',
      client_email: 'test@test.iam.gserviceaccount.com',
    }),
  },
};

console.log('原始配置:', JSON.stringify(testConfig, null, 2));

try {
  // 加密
  const encrypted = encryptSiteConfigObject(testConfig);
  console.log('\n✅ 加密成功');
  console.log('密文长度:', encrypted.length, '字符');
  console.log('密文预览:', encrypted.substring(0, 50) + '...');
  
  // 解密
  const decrypted = decryptSiteConfigObject(encrypted);
  console.log('\n✅ 解密成功');
  console.log('解密配置:', JSON.stringify(decrypted, null, 2));
  
  // 验证
  const isMatch = JSON.stringify(testConfig) === JSON.stringify(decrypted);
  
  if (isMatch) {
    console.log('\n✅ 验证通过: 解密后的数据与原始数据完全一致');
  } else {
    console.error('\n❌ 验证失败: 解密后的数据与原始数据不一致');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ 测试失败:', error);
  process.exit(1);
}

// 3. 性能测试
console.log('\n📋 步骤 3: 性能测试...');

const iterations = 1000;
const startTime = Date.now();

for (let i = 0; i < iterations; i++) {
  const encrypted = encryptSiteConfigObject(testConfig);
  decryptSiteConfigObject(encrypted);
}

const duration = Date.now() - startTime;
const avgTime = duration / iterations;

console.log(`✅ 完成 ${iterations} 次加密/解密循环`);
console.log(`   总耗时: ${duration}ms`);
console.log(`   平均耗时: ${avgTime.toFixed(2)}ms/次`);

// 4. 总结
console.log('\n' + '=' .repeat(60));
console.log('✅ 所有测试通过！');
console.log('\n📊 测试结果:');
console.log('   - 加密密钥: 有效');
console.log('   - 加密/解密: 正常');
console.log('   - 数据完整性: 验证通过');
console.log(`   - 性能: ${avgTime.toFixed(2)}ms/次`);
console.log('\n🚀 SoloBoard 加密系统已就绪！\n');



