/**
 * GET /api/digital-heirloom/recovery-kit/print-data
 * 获取恢复包打印数据
 * 用于生成 Heirloom-Gold 风格的打印模板
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { findDigitalVaultByUserId, findDigitalVaultById } from '@/shared/models/digital-vault';
import { findBeneficiaryById } from '@/shared/models/beneficiary';
import { calculateMnemonicChecksum } from '@/shared/lib/checksum';
import * as bip39 from 'bip39';

export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const authResult = await requireAuth();
    if (authResult.error) {
      return authResult.error;
    }

    const user = authResult.user;
    const { searchParams } = new URL(request.url);
    const vaultId = searchParams.get('vaultId');
    const beneficiaryId = searchParams.get('beneficiaryId');

    // 获取保险箱
    let vault;
    if (vaultId) {
      vault = await findDigitalVaultById(vaultId);
      if (!vault) {
        return respErr('Vault not found');
      }
      // 验证权限：用户只能访问自己的保险箱
      if (vault.userId !== user.id) {
        return respErr('Unauthorized: You can only access your own vault');
      }
    } else {
      // 如果没有提供 vaultId，获取用户的保险箱
      vault = await findDigitalVaultByUserId(user.id);
      if (!vault) {
        return respErr('Vault not found. Create one first.');
      }
    }

    // 获取受益人信息（如果提供了 beneficiaryId）
    let beneficiary = null;
    if (beneficiaryId) {
      beneficiary = await findBeneficiaryById(beneficiaryId);
      if (!beneficiary) {
        return respErr('Beneficiary not found');
      }
      // 验证受益人属于该保险箱
      if (beneficiary.vaultId !== vault.id) {
        return respErr('Beneficiary does not belong to this vault');
      }
    }

    // 检查是否已有恢复包数据（从数据库获取）
    // 如果 vault 中有恢复包数据，使用它；否则生成新的（仅用于显示，不保存）
    let mnemonicA: string[] = [];
    let mnemonicB: string[] = [];
    let checksumA = '';
    let checksumB = '';

    // 注意：由于零知识证明原则，服务器端无法存储或访问助记词
    // 助记词应该在客户端生成，并在打印时从客户端传入
    // 这里为了打印预览，我们生成临时助记词（实际应用中应该从客户端传递）
    
    // 检查请求参数中是否有助记词（从客户端传递）
    const clientMnemonic = searchParams.get('mnemonic');
    
    let mnemonicArray: string[] = [];
    
    if (clientMnemonic) {
      // 使用客户端传递的助记词
      mnemonicArray = clientMnemonic.split(' ').filter(w => w.trim().length > 0);
      if (mnemonicArray.length !== 24) {
        return respErr('Invalid mnemonic: must contain 24 words');
      }
    } else {
      // 生成临时助记词用于打印预览
      // 实际应用中，应该要求客户端传递助记词
      const tempMnemonic = bip39.generateMnemonic(256); // 24 words
      mnemonicArray = tempMnemonic.split(' ');
    }
    
    // 分成两部分（各12个单词）
    mnemonicA = mnemonicArray.slice(0, 12);
    mnemonicB = mnemonicArray.slice(12, 24);
    
    // 计算校验和
    checksumA = await calculateMnemonicChecksum(mnemonicA.join(' '));
    checksumB = await calculateMnemonicChecksum(mnemonicB.join(' '));

    // 生成文档 ID（格式：HV-YYYY-MMDD-XXXX）
    const now = new Date();
    const documentId = `HV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${vault.id.substring(0, 4).toUpperCase()}`;

    // 生成日期字符串
    const generatedAt = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) + ` at ${now.toUTCString().split(' ')[4]} UTC`;

    // 过期日期（100年后）
    const expiresAt = new Date(now.getFullYear() + 100, now.getMonth(), now.getDate())
      .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // 受益人名称
    const beneficiaryName = beneficiary
      ? `${beneficiary.name}${beneficiary.email ? ` (${beneficiary.email})` : ''}`
      : 'Beneficiary';

    return respData({
      documentId,
      generatedAt,
      expiresAt,
      beneficiary: beneficiaryName,
      beneficiaryLanguage: beneficiary?.language || 'en',
      mnemonicA,
      mnemonicB,
      checksumA,
      checksumB,
      vaultId: vault.id,
      beneficiaryId: beneficiary?.id || null,
    });
  } catch (error: any) {
    console.error('Get recovery kit print data failed:', error);
    return respErr(error.message || 'Failed to get recovery kit print data');
  }
}

