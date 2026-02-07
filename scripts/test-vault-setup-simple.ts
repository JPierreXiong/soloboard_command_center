/**
 * 简化版测试脚本：直接测试保险箱初始化 API
 * 
 * 功能：
 * 1. 模拟完整的保险箱设置数据
 * 2. 调用初始化 API
 * 3. 验证结果
 * 
 * 注意：需要先登录系统获取有效的 session cookie
 */

import crypto from 'crypto';

// 测试配置
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  sessionCookie: process.env.TEST_SESSION_COOKIE || '', // 从浏览器开发者工具获取
  masterPassword: 'TestPassword123!@#',
  hint: 'Test hint question',
  assets: [
    {
      type: 'account',
      platform: 'Facebook',
      username: 'testuser',
      password: 'testpass123',
      notes: 'Test account',
    },
  ],
  beneficiaries: [
    {
      name: 'Test Beneficiary',
      email: 'beneficiary@test.com',
      relationship: 'friend',
      language: 'en',
      phone: '+1234567890',
    },
  ],
  settings: {
    heartbeatFrequency: 30,
    gracePeriod: 7,
    deadManSwitchEnabled: true,
  },
};

// 简化的加密函数（Node.js 环境）
async function encryptDataNode(plainText: string, password: string) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12); // GCM 需要 12 字节 IV

  // 使用 PBKDF2 派生密钥
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

  // 使用 AES-256-GCM 加密
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: Buffer.concat([encrypted, authTag]).toString('base64'),
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
  };
}

// 生成助记词（简化版）
function generateMnemonic(): string {
  const words = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
    'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
    'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actual', 'adapt',
  ];
  return words.slice(0, 24).join(' ');
}

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

class VaultSetupTester {
  private results: TestResult[] = [];
  private vaultId: string | null = null;

  async run() {
    console.log('========================================');
    console.log('🚀 开始测试保险箱设置流程');
    console.log('========================================\n');

    try {
      // Step 1: 准备加密数据
      await this.step1_PrepareData();

      // Step 2: 调用初始化 API
      await this.step2_InitializeVault();

      // Step 3: 验证保险箱创建
      await this.step3_VerifyVault();

      // 打印测试结果
      this.printResults();
    } catch (error: any) {
      console.error('❌ 测试失败:', error.message);
      this.results.push({
        step: 'Error',
        success: false,
        message: error.message,
        error: error,
      });
      this.printResults();
      process.exit(1);
    }
  }

  private async step1_PrepareData() {
    console.log('📝 Step 1: 准备加密数据...');
    
    try {
      // 构建要加密的数据
      const vaultContent = {
        assets: TEST_CONFIG.assets,
        finalMessage: 'This is a test final message.',
        createdAt: new Date().toISOString(),
      };

      // 加密资产数据
      const { encryptedData, salt, iv } = await encryptDataNode(
        JSON.stringify(vaultContent),
        TEST_CONFIG.masterPassword
      );

      // 生成恢复包助记词
      const mnemonicPhrase = generateMnemonic();

      // 加密主密码备份
      const { encryptedData: backupToken, salt: backupSalt, iv: backupIv } = 
        await encryptDataNode(TEST_CONFIG.masterPassword, mnemonicPhrase);

      this.testData = {
        vaultData: {
          encryptedData,
          encryptionSalt: salt,
          encryptionIv: iv,
          recoveryBackupToken: backupToken,
          recoveryBackupSalt: backupSalt,
          recoveryBackupIv: backupIv,
          encryptionHint: TEST_CONFIG.hint,
        },
        beneficiaries: TEST_CONFIG.beneficiaries,
        settings: TEST_CONFIG.settings,
      };

      this.results.push({
        step: 'Step 1: Prepare Data',
        success: true,
        message: '数据准备成功',
        data: {
          assetsCount: TEST_CONFIG.assets.length,
          beneficiariesCount: TEST_CONFIG.beneficiaries.length,
          encrypted: true,
        },
      });

      console.log('✅ Step 1 完成\n');
    } catch (error: any) {
      console.error('❌ Step 1 失败:', error.message);
      this.results.push({
        step: 'Step 1: Prepare Data',
        success: false,
        message: error.message,
        error,
      });
      throw error;
    }
  }

  private testData: any = null;

  private async step2_InitializeVault() {
    console.log('📝 Step 2: 调用初始化 API...');
    
    try {
      if (!this.testData) {
        throw new Error('测试数据未准备');
      }

      // 准备请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 如果有 session cookie，添加到请求头
      if (TEST_CONFIG.sessionCookie) {
        headers['Cookie'] = TEST_CONFIG.sessionCookie;
      }

      // 调用 API
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/digital-heirloom/vault/initialize`, {
        method: 'POST',
        headers,
        body: JSON.stringify(this.testData),
      });

      const result = await response.json();

      console.log('API 响应状态:', response.status);
      console.log('API 响应数据:', JSON.stringify(result, null, 2));

      if (!response.ok || result.code !== 200) {
        throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // 验证返回的数据
      if (!result.data || !result.data.vault) {
        throw new Error('无效的响应数据：缺少 vault 信息');
      }

      this.vaultId = result.data.vault.id;

      this.results.push({
        step: 'Step 2: Initialize Vault',
        success: true,
        message: '保险箱初始化成功',
        data: {
          vaultId: result.data.vault.id,
          status: result.data.vault.status,
          beneficiariesCount: result.data.beneficiariesCount,
          heartbeatFrequency: result.data.vault.heartbeatFrequency,
          gracePeriod: result.data.vault.gracePeriod,
        },
      });

      console.log('✅ Step 2 完成\n');
    } catch (error: any) {
      console.error('❌ Step 2 失败:', error.message);
      if (error.response) {
        console.error('响应详情:', error.response.data);
      }
      this.results.push({
        step: 'Step 2: Initialize Vault',
        success: false,
        message: error.message,
        error: error.response?.data || error,
      });
      throw error;
    }
  }

  private async step3_VerifyVault() {
    console.log('🔍 Step 3: 验证保险箱创建...');
    
    try {
      if (!this.vaultId) {
        throw new Error('Vault ID 未找到');
      }

      // 准备请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 如果有 session cookie，添加到请求头
      if (TEST_CONFIG.sessionCookie) {
        headers['Cookie'] = TEST_CONFIG.sessionCookie;
      }

      // 调用 API 获取保险箱信息
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/digital-heirloom/vault/get`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();

      console.log('验证 API 响应状态:', response.status);
      console.log('验证 API 响应数据:', JSON.stringify(result, null, 2));

      if (result.code !== 200 || !result.data?.vault) {
        throw new Error(result.message || '无法获取保险箱信息');
      }

      const vault = result.data.vault;

      // 验证保险箱状态
      if (vault.status !== 'active') {
        throw new Error(`保险箱状态不正确: 期望 'active'，实际 '${vault.status}'`);
      }

      // 验证受益人数量
      if (!result.data.beneficiaries || result.data.beneficiaries.length !== TEST_CONFIG.beneficiaries.length) {
        throw new Error(
          `受益人数量不正确: 期望 ${TEST_CONFIG.beneficiaries.length}，实际 ${result.data.beneficiaries?.length || 0}`
        );
      }

      // 验证设置
      if (vault.heartbeatFrequency !== TEST_CONFIG.settings.heartbeatFrequency) {
        throw new Error(
          `心跳频率不正确: 期望 ${TEST_CONFIG.settings.heartbeatFrequency}，实际 ${vault.heartbeatFrequency}`
        );
      }

      if (vault.gracePeriod !== TEST_CONFIG.settings.gracePeriod) {
        throw new Error(
          `宽限期不正确: 期望 ${TEST_CONFIG.settings.gracePeriod}，实际 ${vault.gracePeriod}`
        );
      }

      this.results.push({
        step: 'Step 3: Verify Vault',
        success: true,
        message: '保险箱验证成功',
        data: {
          vaultId: vault.id,
          status: vault.status,
          beneficiariesCount: result.data.beneficiaries.length,
          heartbeatFrequency: vault.heartbeatFrequency,
          gracePeriod: vault.gracePeriod,
          deadManSwitchEnabled: vault.deadManSwitchEnabled,
        },
      });

      console.log('✅ Step 3 完成\n');
    } catch (error: any) {
      console.error('❌ Step 3 失败:', error.message);
      this.results.push({
        step: 'Step 3: Verify Vault',
        success: false,
        message: error.message,
        error: error.response?.data || error,
      });
      throw error;
    }
  }

  private printResults() {
    console.log('\n========================================');
    console.log('📊 测试结果汇总');
    console.log('========================================\n');

    let successCount = 0;
    let failCount = 0;

    this.results.forEach((result) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.step}`);
      console.log(`   消息: ${result.message}`);
      if (result.data) {
        console.log(`   数据: ${JSON.stringify(result.data, null, 2)}`);
      }
      if (result.error) {
        console.log(`   错误: ${JSON.stringify(result.error, null, 2)}`);
      }
      console.log('');

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    });

    console.log('========================================');
    console.log(`总计: ${this.results.length} 个步骤`);
    console.log(`成功: ${successCount} 个`);
    console.log(`失败: ${failCount} 个`);
    console.log('========================================\n');

    if (failCount === 0) {
      console.log('🎉 所有测试通过！保险箱设置流程完整且正确。\n');
      console.log('📋 测试总结:');
      console.log(`   - 保险箱 ID: ${this.vaultId}`);
      console.log(`   - 状态: active`);
      console.log(`   - 受益人数量: ${TEST_CONFIG.beneficiaries.length}`);
      console.log(`   - 心跳频率: ${TEST_CONFIG.settings.heartbeatFrequency} 天`);
      console.log(`   - 宽限期: ${TEST_CONFIG.settings.gracePeriod} 天`);
      console.log('');
    } else {
      console.log('⚠️  部分测试失败，请检查错误信息。\n');
      console.log('💡 提示:');
      console.log('   1. 确保开发服务器正在运行 (npm run dev)');
      console.log('   2. 确保已登录系统（需要有效的 session cookie）');
      console.log('   3. 获取 session cookie:');
      console.log('      a. 打开浏览器，登录系统');
      console.log('      b. 打开开发者工具 (F12)');
      console.log('      c. 进入 Application/Storage -> Cookies');
      console.log('      d. 找到 better-auth.session_token cookie');
      console.log('      e. 复制完整的 cookie 值');
      console.log('   4. 运行测试时设置环境变量:');
      console.log('      $env:TEST_SESSION_COOKIE="better-auth.session_token=你的token值"; npx tsx scripts/test-vault-setup-simple.ts');
      console.log('   5. 或者直接在代码中设置 TEST_CONFIG.sessionCookie');
      console.log('');
      process.exit(1);
    }
  }
}

// 显示使用说明
if (require.main === module && !TEST_CONFIG.sessionCookie) {
  console.log('========================================');
  console.log('⚠️  测试需要认证');
  console.log('========================================\n');
  console.log('请先登录系统，然后获取 session cookie：\n');
  console.log('1. 打开浏览器，访问 http://localhost:3000');
  console.log('2. 登录系统');
  console.log('3. 打开开发者工具 (F12)');
  console.log('4. 进入 Application/Storage -> Cookies');
  console.log('5. 找到 better-auth.session_token cookie');
  console.log('6. 复制完整的 cookie 值\n');
  console.log('然后运行：\n');
  console.log('  PowerShell:');
  console.log('    $env:TEST_SESSION_COOKIE="better-auth.session_token=你的token值"; npx tsx scripts/test-vault-setup-simple.ts\n');
  console.log('  Bash:');
  console.log('    TEST_SESSION_COOKIE="better-auth.session_token=你的token值" npx tsx scripts/test-vault-setup-simple.ts\n');
  console.log('========================================\n');
}

// 运行测试
if (require.main === module) {
  const tester = new VaultSetupTester();
  tester.run().catch((error) => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

export { VaultSetupTester };

