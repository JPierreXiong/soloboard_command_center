/**
 * API Route: 预览资产（受益人访问）
 * 功能：
 * - 验证释放令牌
 * - 生成临时签名 URL（用于下载加密文件）
 * - 返回解密参数
 * - 校验和验证
 * 
 * 核心原则：不改变 ShipAny 结构，仅提供文件访问
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { respData, respErr } from '@/shared/lib/resp';
import { validateReleaseToken } from '@/shared/models/beneficiary';

export async function GET(request: NextRequest) {
  try {
    // 1. 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const releaseToken = searchParams.get('token');
    const assetId = searchParams.get('asset_id');

    if (!releaseToken || !assetId) {
      return respErr('Release token and asset ID are required', 400);
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. 验证释放令牌
    const tokenValidation = await validateReleaseToken(releaseToken);
    if (!tokenValidation.valid || !tokenValidation.beneficiary) {
      return respErr(tokenValidation.reason || 'Invalid or expired release token', 401);
    }
    const beneficiary = tokenValidation.beneficiary;

    // 3. 查询资产（确保资产属于该受益人的保险箱）
    const { data: asset, error: assetError } = await supabase
      .from('vault_assets')
      .select('*')
      .eq('id', assetId)
      .eq('vault_id', beneficiary.vault_id)
      .eq('status', 'active')
      .single();

    if (assetError || !asset) {
      return respErr('Asset not found or not accessible', 404);
    }

    // 4. 生成临时签名 URL（1 小时有效）
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('digital_heirloom_assets')
      .createSignedUrl(asset.storage_path, 3600); // 1 小时

    if (urlError || !signedUrlData) {
      return respErr(`Failed to generate download URL: ${urlError?.message}`, 500);
    }

    // 5. 返回预览数据（包含解密参数和下载 URL）
    return respData({
      asset: {
        id: asset.id,
        file_name: asset.file_name,
        display_name: asset.display_name,
        file_type: asset.file_type,
        file_size: asset.file_size,
        category: asset.category,
        version: asset.version,
      },
      download_url: signedUrlData.signedUrl, // 临时签名 URL
      encryption_salt: asset.encryption_salt, // 解密需要
      encryption_iv: asset.encryption_iv, // 解密需要
      checksum: asset.checksum, // 完整性验证
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // URL 过期时间
      // ⚠️ 不返回文件内容（文件从 Blob Storage 下载）
    });
  } catch (error) {
    console.error('Preview asset error:', error);
    return respErr(error instanceof Error ? error.message : 'Internal server error', 500);
  }
}

