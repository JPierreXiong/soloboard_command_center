/**
 * API Route: 获取单个资产详情
 * 功能：
 * - 查询资产元数据
 * - 返回加密参数（用于客户端解密）
 * - 不返回文件内容（文件从 Blob Storage 下载）
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { findDigitalVaultByUserId } from '@/shared/models/digital-vault';

export async function GET(request: NextRequest) {
  try {
    // 1. 身份验证
    const authResult = await requireAuth();
    if (authResult.error) {
      return authResult.error;
    }
    const user = authResult.user;

    // 2. 获取用户的保险箱
    const vault = await findDigitalVaultByUserId(user.id);
    if (!vault) {
      return respErr('Vault not found. Please initialize your vault first.', 404);
    }

    // 3. 获取资产 ID
    const searchParams = request.nextUrl.searchParams;
    const assetId = searchParams.get('id');

    if (!assetId) {
      return respErr('Asset ID is required', 400);
    }

    // 4. 查询资产详情
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: asset, error } = await supabase
      .from('vault_assets')
      .select('*')
      .eq('id', assetId)
      .eq('vault_id', vault.id) // 确保资产属于当前用户
      .single();

    if (error || !asset) {
      return respErr('Asset not found', 404);
    }

    // 5. 返回资产详情（包含加密参数，用于客户端解密）
    return respData({
      id: asset.id,
      file_name: asset.file_name,
      display_name: asset.display_name,
      file_type: asset.file_type,
      file_size: asset.file_size,
      storage_path: asset.storage_path, // 用于从 Blob Storage 下载
      encryption_salt: asset.encryption_salt, // 解密需要
      encryption_iv: asset.encryption_iv, // 解密需要
      checksum: asset.checksum, // 完整性验证
      category: asset.category,
      version: asset.version,
      status: asset.status,
      created_at: asset.created_at,
      updated_at: asset.updated_at,
      // ⚠️ 不返回文件内容（文件从 Blob Storage 下载）
    });
  } catch (error) {
    console.error('Get asset error:', error);
    return respErr(error instanceof Error ? error.message : 'Internal server error', 500);
  }
}

