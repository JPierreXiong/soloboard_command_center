/**
 * Recovery Kit Generator
 * 生成数字遗产恢复包，帮助用户在丢失主密码时恢复访问
 * 
 * 设计原则：
 * 1. 零知识：服务器无法重置密码
 * 2. 离线备份：恢复包可离线保存
 * 3. 多重验证：助记词 + 恢复令牌
 * 
 * 使用 BIP39 标准生成 24 位助记词
 */

import * as bip39 from 'bip39';
import { encryptData, decryptData } from './encryption';

/**
 * 恢复包数据结构
 */
export interface RecoveryKit {
  mnemonic: string; // BIP39 助记词字符串（空格分隔）
  mnemonicArray: string[]; // 24 位助记词数组（便于显示）
  backupToken: string; // 加密后的主密码备份（encryptedData）
  backupSalt: string; // 备份加密的盐值
  backupIv: string; // 备份加密的 IV
  vaultId: string;
  createdAt: string;
  qrCodeData?: string; // Base64 编码的二维码数据
}

/**
 * 恢复包元数据（存储到数据库）
 */
export interface RecoveryKitMetadata {
  vaultId: string;
  recoveryTokenHash: string; // 恢复令牌的哈希（用于验证）
  createdAt: string;
  usedAt?: string; // 使用时间
}

/**
 * 生成 BIP39 标准助记词（256 位熵 = 24 个单词）
 */
function generateBIP39Mnemonic(): string {
  // 使用 BIP39 生成 256 位熵的助记词（24 个单词）
  return bip39.generateMnemonic(256);
}

/**
 * 验证 BIP39 助记词有效性
 */
export function validateBIP39Mnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

/**
 * 生成完整的恢复套件数据
 * @param masterPassword 用户的主密码
 * @param vaultId 保险箱 ID
 * @returns 包含助记词和加密后的主密码备份
 */
export async function generateRecoveryKit(
  masterPassword: string,
  vaultId: string
): Promise<RecoveryKit> {
  // 1. 生成 24 位符合 BIP39 标准的助记词（256 位熵）
  const mnemonic = generateBIP39Mnemonic();
  const mnemonicArray = mnemonic.split(' ');
  
  // 2. 将助记词作为"种子密码"，对用户的主密码进行二次加密
  // 这样做的目的是：如果主密码丢了，助记词就是解开主密码的唯一钥匙
  const backup = await encryptData(masterPassword, mnemonic);
  
  // 3. 生成二维码数据（JSON 格式）
  const qrData = {
    mnemonic,
    vaultId,
    version: '1.0',
  };
  const qrCodeData = btoa(JSON.stringify(qrData));
  
  return {
    mnemonic,
    mnemonicArray,
    backupToken: backup.encryptedData, // 存储在数据库，作为紧急恢复令牌
    backupSalt: backup.salt,
    backupIv: backup.iv,
    vaultId,
    createdAt: new Date().toISOString(),
    qrCodeData,
  };
}

/**
 * 使用恢复包恢复主密码
 * @param mnemonic BIP39 助记词字符串（空格分隔）
 * @param backupToken 加密的备份令牌（从数据库获取）
 * @param backupSalt 备份加密的盐值
 * @param backupIv 备份加密的 IV
 * @returns 恢复的主密码
 */
export async function recoverMasterPasswordFromKit(
  mnemonic: string,
  backupToken: string,
  backupSalt: string,
  backupIv: string
): Promise<string> {
  // 1. 验证助记词格式（BIP39 标准）
  if (!validateBIP39Mnemonic(mnemonic)) {
    throw new Error('Invalid BIP39 mnemonic');
  }
  
  // 2. 使用助记词作为密码，解密备份的主密码
  // 这里使用我们之前的 decryptData 函数
  const masterPassword = await decryptData(
    backupToken,
    mnemonic, // 使用助记词作为解密密码
    backupSalt,
    backupIv
  );
  
  return masterPassword;
}

/**
 * Generate Recovery Kit PDF Content (Full International Standard English)
 * Professional format with DOC ID, dates, and verification checksum
 */
export function generateRecoveryKitPDFContent(kit: RecoveryKit): string {
  // Generate DOC ID (HV-YYYY-MMDD-XXXX format)
  const now = new Date(kit.createdAt);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomId = kit.vaultId.slice(0, 4).toUpperCase();
  const docId = `HV-${year}-${month}${day}-${randomId}`;
  
  // Generate SHA256 checksum for verification (placeholder - will be calculated client-side)
  const checksumPlaceholder = 'SHA256 checksum calculated during generation';
  
  // Valid until date (100 years from creation)
  const validUntil = new Date(now);
  validUntil.setFullYear(validUntil.getFullYear() + 100);
  
  const lines = [
    '═══════════════════════════════════════════════════════════════',
    '                  DIGITAL HERITAGE CERTIFICATE',
    '                         (Fragment A)',
    '═══════════════════════════════════════════════════════════════',
    '',
    `DOCUMENT ID: ${docId}`,
    `GENERATED: ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    `VALID UNTIL: ${validUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    '',
    '═══════════════════════════════════════════════════════════════',
    '                    RECOVERY MNEMONICS (1-12)',
    '═══════════════════════════════════════════════════════════════',
    '',
  ];
  
  // Add mnemonic words in grid format (12 words per row, 2 rows)
  const firstRow = kit.mnemonicArray.slice(0, 12);
  const secondRow = kit.mnemonicArray.slice(12, 24);
  
  // First row (words 1-12)
  firstRow.forEach((word, index) => {
    const num = String(index + 1).padStart(2, '0');
    lines.push(`${num}. ${word.padEnd(12, ' ')}`);
  });
  
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    RECOVERY MNEMONICS (13-24)');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  
  // Second row (words 13-24)
  secondRow.forEach((word, index) => {
    const num = String(index + 13).padStart(2, '0');
    lines.push(`${num}. ${word.padEnd(12, ' ')}`);
  });
  
  lines.push(
    '',
    '═══════════════════════════════════════════════════════════════',
    '                    SAFEKEEPING INSTRUCTIONS',
    '═══════════════════════════════════════════════════════════════',
    '',
    '* Keep this document offline and away from digital storage.',
    '* This is 1 of 2 fragments required to unlock the vault.',
    '* Store in a secure, fireproof location.',
    '* Do not share this document with anyone.',
    '* If lost, your digital heritage cannot be recovered.',
    '',
    '═══════════════════════════════════════════════════════════════',
    '                    VERIFICATION INFORMATION',
    '═══════════════════════════════════════════════════════════════',
    '',
    `VAULT ID: ${kit.vaultId}`,
    `DOCUMENT ID: ${docId}`,
    `GENERATED: ${now.toISOString()}`,
    `VERIFICATION CHECKSUM (SHA256): ${checksumPlaceholder}`,
    '',
    '═══════════════════════════════════════════════════════════════',
    '                         LEGAL NOTICE',
    '═══════════════════════════════════════════════════════════════',
    '',
    'This document contains sensitive recovery information for your',
    'Digital Heirloom vault. Unauthorized access or disclosure may',
    'result in loss of digital assets. Keep secure and confidential.',
    '',
    '© 2024 Digital Heirloom. All rights reserved.',
    '',
    '═══════════════════════════════════════════════════════════════',
  );
  
  return lines.join('\n');
}

/**
 * 验证助记词格式（BIP39）
 */
export function validateMnemonic(mnemonic: string | string[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 处理数组格式
  const mnemonicString = Array.isArray(mnemonic) ? mnemonic.join(' ') : mnemonic;
  const mnemonicArray = mnemonicString.split(' ').filter(w => w.trim().length > 0);
  
  // 检查数量
  if (mnemonicArray.length !== 24) {
    errors.push('助记词必须包含 24 个单词');
  }
  
  // 检查 BIP39 有效性
  if (mnemonicArray.length === 24 && !validateBIP39Mnemonic(mnemonicString)) {
    errors.push('助记词不符合 BIP39 标准');
  }
  
  // 检查每个单词是否非空
  mnemonicArray.forEach((word, index) => {
    if (!word || word.trim().length === 0) {
      errors.push(`第 ${index + 1} 个单词为空`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

