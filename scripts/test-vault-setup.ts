/**
 * 测试脚本：模拟完整的保险箱设置流程
 * 
 * 功能：
 * 1. 模拟用户登录（需要有效的 session）
 * 2. 完成 Step 1-4 设置流程
 * 3. 验证保险箱创建成功
 * 4. 验证受益人创建成功
 * 5. 验证流程闭环
 */

import { encryptData } from '../src/shared/lib/encryption';
import { generateRecoveryKit } from '../src/shared/lib/recovery-kit';
import { getUuid } from '../src/shared/lib/hash';

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  locale: 'en',
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

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

class VaultSetupTester {
  private results: TestResult[] = [];
  private sessionCookie: string | null = null;

  async run() {
    console.log('========================================');
    console.log('🚀 开始测试保险箱设置流程');
    console.log('========================================\n');

    try {
      // Step 1: 设置主密码并生成恢复包
      await this.step1_MasterPassword();

      // Step 2: 添加数字资产
      await this.step2_AddAssets();

      // Step 3: 添加受益人
      await this.step3_AddBeneficiaries();

      // Step 4: 设置触发规则并完成
      await this.step4_CompleteSetup();

      // 验证最终结果
      await this.verifyVaultCreated();

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

  private async step1_MasterPassword() {
    console.log('📝 Step 1: 设置主密码...');
    
    try {
      // 生成测试用的 vaultId
      const testVaultId = getUuid();
      
      // 生成恢复包
      const recoveryKit = await generateRecoveryKit(TEST_CONFIG.masterPassword, testVaultId);
      
      // 加密主密码备份（使用助记词作为加密密码）
      // 注意：recoveryKit 已经包含了备份信息，这里只是为了测试
      const { encryptedData: backupToken, salt: backupSalt, iv: backupIv } = 
        await encryptData(TEST_CONFIG.masterPassword, recoveryKit.mnemonic);

      const step1Data = {
        password: TEST_CONFIG.masterPassword,
        hint: TEST_CONFIG.hint,
        recoveryKit: {
          mnemonic: recoveryKit.mnemonic,
          mnemonicArray: recoveryKit.mnemonicArray,
          backupToken: recoveryKit.backupToken, // 使用 recoveryKit 中的备份
          backupSalt: recoveryKit.backupSalt,
          backupIv: recoveryKit.backupIv,
          vaultId: recoveryKit.vaultId,
        },
      };

      this.results.push({
        step: 'Step 1: Master Password',
        success: true,
        message: '主密码设置成功，恢复包已生成',
        data: {
          recoveryKitGenerated: true,
          mnemonicLength: recoveryKit.mnemonicArray.length,
        },
      });

      // 保存到 sessionStorage（模拟）
      if (typeof global !== 'undefined') {
        (global as any).testSetupData = {
          step: 1,
          ...step1Data,
        };
      }

      console.log('✅ Step 1 完成\n');
    } catch (error: any) {
      console.error('❌ Step 1 失败:', error.message);
      this.results.push({
        step: 'Step 1: Master Password',
        success: false,
        message: error.message,
        error,
      });
      throw error;
    }
  }

  private async step2_AddAssets() {
    console.log('📝 Step 2: 添加数字资产...');
    
    try {
      const setupData = (global as any).testSetupData;
      if (!setupData || !setupData.password) {
        throw new Error('Step 1 数据未找到');
      }

      // 构建要加密的数据
      const vaultContent = {
        assets: TEST_CONFIG.assets,
        finalMessage: 'This is a test final message.',
        createdAt: new Date().toISOString(),
      };

      // 客户端加密
      const { encryptedData, salt, iv } = await encryptData(
        JSON.stringify(vaultContent),
        setupData.password
      );

      const step2Data = {
        encryptedData,
        encryptionSalt: salt,
        encryptionIv: iv,
      };

      // 更新 sessionStorage（模拟）
      (global as any).testSetupData = {
        ...setupData,
        step: 2,
        ...step2Data,
      };

      this.results.push({
        step: 'Step 2: Add Assets',
        success: true,
        message: `成功加密 ${TEST_CONFIG.assets.length} 个资产`,
        data: {
          assetsCount: TEST_CONFIG.assets.length,
          encrypted: true,
        },
      });

      console.log('✅ Step 2 完成\n');
    } catch (error: any) {
      console.error('❌ Step 2 失败:', error.message);
      this.results.push({
        step: 'Step 2: Add Assets',
        success: false,
        message: error.message,
        error,
      });
      throw error;
    }
  }

  private async step3_AddBeneficiaries() {
    console.log('📝 Step 3: 添加受益人...');
    
    try {
      const setupData = (global as any).testSetupData;
      if (!setupData) {
        throw new Error('Setup 数据未找到');
      }

      // 验证受益人数据
      for (const beneficiary of TEST_CONFIG.beneficiaries) {
        if (!beneficiary.name || !beneficiary.email) {
          throw new Error('受益人数据不完整');
        }
      }

      // 更新 sessionStorage（模拟）
      (global as any).testSetupData = {
        ...setupData,
        step: 3,
        beneficiaries: TEST_CONFIG.beneficiaries,
      };

      this.results.push({
        step: 'Step 3: Add Beneficiaries',
        success: true,
        message: `成功添加 ${TEST_CONFIG.beneficiaries.length} 个受益人`,
        data: {
          beneficiariesCount: TEST_CONFIG.beneficiaries.length,
        },
      });

      console.log('✅ Step 3 完成\n');
    } catch (error: any) {
      console.error('❌ Step 3 失败:', error.message);
      this.results.push({
        step: 'Step 3: Add Beneficiaries',
        success: false,
        message: error.message,
        error,
      });
      throw error;
    }
  }

  private async step4_CompleteSetup() {
    console.log('📝 Step 4: 完成设置并激活保险箱...');
    
    try {
      const setupData = (global as any).testSetupData;
      if (!setupData || !setupData.encryptedData) {
        throw new Error('Step 2 数据未找到');
      }

      // 构建提交数据
      const payload = {
        vaultData: {
          encryptedData: setupData.encryptedData,
          encryptionSalt: setupData.encryptionSalt,
          encryptionIv: setupData.encryptionIv,
          recoveryBackupToken: setupData.recoveryKit?.backupToken,
          recoveryBackupSalt: setupData.recoveryKit?.backupSalt,
          recoveryBackupIv: setupData.recoveryKit?.backupIv,
          encryptionHint: setupData.hint || '',
        },
        beneficiaries: setupData.beneficiaries || TEST_CONFIG.beneficiaries,
        settings: TEST_CONFIG.settings,
      };

      // 调用 API（需要有效的 session）
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/digital-heirloom/vault/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 注意：实际测试需要有效的 session cookie
          // 'Cookie': this.sessionCookie || '',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.code !== 200) {
        throw new Error(result.message || '初始化失败');
      }

      // 验证返回的数据
      if (!result.data || !result.data.vault) {
        throw new Error('无效的响应数据');
      }

      this.results.push({
        step: 'Step 4: Complete Setup',
        success: true,
        message: '保险箱初始化成功',
        data: {
          vaultId: result.data.vault.id,
          status: result.data.vault.status,
          beneficiariesCount: result.data.beneficiariesCount,
        },
      });

      // 保存 vault ID 用于验证
      (global as any).testVaultId = result.data.vault.id;

      console.log('✅ Step 4 完成\n');
    } catch (error: any) {
      console.error('❌ Step 4 失败:', error.message);
      this.results.push({
        step: 'Step 4: Complete Setup',
        success: false,
        message: error.message,
        error: error.response?.data || error,
      });
      throw error;
    }
  }

  private async verifyVaultCreated() {
    console.log('🔍 验证保险箱创建...');
    
    try {
      const vaultId = (global as any).testVaultId;
      if (!vaultId) {
        throw new Error('Vault ID 未找到');
      }

      // 调用 API 获取保险箱信息
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/digital-heirloom/vault/get`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // 注意：实际测试需要有效的 session cookie
          // 'Cookie': this.sessionCookie || '',
        },
      });

      const result = await response.json();

      if (result.code !== 200 || !result.data?.vault) {
        throw new Error('无法获取保险箱信息');
      }

      const vault = result.data.vault;

      // 验证保险箱状态
      if (vault.status !== 'active') {
        throw new Error(`保险箱状态不正确: ${vault.status}`);
      }

      // 验证受益人数量
      if (!result.data.beneficiaries || result.data.beneficiaries.length !== TEST_CONFIG.beneficiaries.length) {
        throw new Error(`受益人数量不正确: ${result.data.beneficiaries?.length || 0}`);
      }

      this.results.push({
        step: 'Verification',
        success: true,
        message: '保险箱验证成功',
        data: {
          vaultId: vault.id,
          status: vault.status,
          beneficiariesCount: result.data.beneficiaries.length,
          heartbeatFrequency: vault.heartbeatFrequency,
          gracePeriod: vault.gracePeriod,
        },
      });

      console.log('✅ 验证完成\n');
    } catch (error: any) {
      console.error('❌ 验证失败:', error.message);
      this.results.push({
        step: 'Verification',
        success: false,
        message: error.message,
        error,
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

    this.results.forEach((result, index) => {
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
    } else {
      console.log('⚠️  部分测试失败，请检查错误信息。\n');
      process.exit(1);
    }
  }
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


