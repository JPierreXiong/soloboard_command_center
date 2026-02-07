/**
 * Fragment Merger
 * 合并和验证 Fragment A/B 助记词的纯函数（服务器端安全）
 * 不依赖任何 DOM API，可以在服务器端和客户端使用
 */

import { validateBIP39Mnemonic } from './recovery-kit';

/**
 * 合并 Fragment A 和 Fragment B
 */
export function mergeFragments(
  fragmentA: string[],
  fragmentB: string[]
): {
  mnemonic: string[];
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 检查数量
  if (fragmentA.length !== 12) {
    errors.push(`Fragment A must contain 12 words, found ${fragmentA.length}`);
  }

  if (fragmentB.length !== 12) {
    errors.push(`Fragment B must contain 12 words, found ${fragmentB.length}`);
  }

  if (errors.length > 0) {
    return {
      mnemonic: [],
      valid: false,
      errors,
    };
  }

  // 合并助记词
  const mergedMnemonic = [...fragmentA, ...fragmentB];

  // 验证合并后的助记词
  try {
    const mnemonicString = mergedMnemonic.join(' ');
    if (!validateBIP39Mnemonic(mnemonicString)) {
      errors.push('Merged mnemonic does not match BIP39 standard');
    }
  } catch (error: any) {
    errors.push(`Validation error: ${error.message}`);
  }

  return {
    mnemonic: mergedMnemonic,
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证 Fragment 助记词（BIP39）
 */
export function validateFragmentMnemonic(
  mnemonic: string[],
  fragment: 'A' | 'B' | 'full'
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 检查数量
  if (fragment === 'full' && mnemonic.length !== 24) {
    errors.push(`Full mnemonic must contain 24 words, found ${mnemonic.length}`);
  } else if ((fragment === 'A' || fragment === 'B') && mnemonic.length !== 12) {
    errors.push(`Fragment ${fragment} must contain 12 words, found ${mnemonic.length}`);
  }
  
  // 检查 BIP39 有效性（如果数量正确）
  if (errors.length === 0) {
    const mnemonicString = mnemonic.join(' ');
    
    // 对于 Fragment A/B，我们需要验证它们是否是完整 24 词助记词的一部分
    // 这里简化处理：只验证单词是否在 BIP39 列表中
    try {
      // 如果 fragment 是 full，直接验证
      if (fragment === 'full') {
        if (!validateBIP39Mnemonic(mnemonicString)) {
          errors.push('Mnemonic does not match BIP39 standard');
        }
      } else {
        // 对于 Fragment A/B，我们暂时只检查单词格式
        // 完整的验证需要在合并后进行
        const invalidWords = mnemonic.filter(word => !/^[a-z]+$/.test(word));
        if (invalidWords.length > 0) {
          errors.push(`Invalid word format: ${invalidWords.join(', ')}`);
        }
      }
    } catch (error: any) {
      errors.push(`Validation error: ${error.message}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
