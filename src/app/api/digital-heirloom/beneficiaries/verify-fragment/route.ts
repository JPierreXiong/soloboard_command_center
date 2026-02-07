/**
 * POST /api/digital-heirloom/beneficiaries/verify-fragment
 * 验证单个 Fragment（A 或 B）
 * 用于半开启状态提示
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { validateReleaseToken } from '@/shared/models/beneficiary';
import { validateFragmentMnemonic } from '@/shared/lib/fragment-merger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { releaseToken, fragment, mnemonic } = body;

    // 验证必需参数
    if (!releaseToken) {
      return respErr('releaseToken is required');
    }

    if (!fragment || !['A', 'B'].includes(fragment)) {
      return respErr('fragment must be "A" or "B"');
    }

    if (!mnemonic || !Array.isArray(mnemonic) || mnemonic.length !== 12) {
      return respErr('mnemonic must be an array of 12 words');
    }

    // 验证 Release Token
    const tokenValidation = await validateReleaseToken(releaseToken);
    if (!tokenValidation.valid) {
      return respErr(tokenValidation.reason || 'Invalid or expired token');
    }

    const beneficiary = tokenValidation.beneficiary!;

    // 验证 Fragment 助记词
    const validation = validateFragmentMnemonic(mnemonic, fragment as 'A' | 'B');

    if (!validation.valid) {
      return respErr(`Fragment ${fragment} validation failed: ${validation.errors.join(', ')}`);
    }

    // 返回验证结果
    const nextFragment = fragment === 'A' ? 'B' : 'A';
    const message = fragment === 'A'
      ? 'Fragment A 验证成功，请提供 Fragment B 以解锁完整资产'
      : 'Fragment B 验证成功，请提供 Fragment A 以解锁完整资产';

    return respData({
      verified: true,
      fragment,
      message,
      nextStep: `upload_fragment_${nextFragment}`,
      beneficiaryId: beneficiary.id,
    });
  } catch (error: any) {
    console.error('Verify fragment failed:', error);
    return respErr(error.message || 'Failed to verify fragment');
  }
}
