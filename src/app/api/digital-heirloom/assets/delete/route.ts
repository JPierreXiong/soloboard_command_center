/**
 * API Route: 删除资产
 * 功能：
 * - 软删除资产（标记为 deleted）
 * - 可选：删除 Blob Storage 中的文件
 * - 记录删除操作日志
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { findDigitalVaultByUserId } from '@/shared/models/digital-vault';

export async function POST(request: NextRequest) {
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

    // 3. 解析请求体
    const body = await request.json();
    const { asset_id, delete_file } = body; // delete_file: 是否同时删除 Blob Storage 中的文件

    if (!asset_id) {
      return respErr('Asset ID is required', 400);
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 4. 查询资产
    const { data: asset, error: fetchError } = await supabase
      .from('vault_assets')
      .select('storage_path')
      .eq('id', asset_id)
      .eq('vault_id', vault.id)
      .single();

    if (fetchError || !asset) {
      return respErr('Asset not found', 404);
    }

    // 5. 软删除（标记为 deleted）
    const { error: deleteError } = await supabase
      .from('vault_assets')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', asset_id)
      .eq('vault_id', vault.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return respErr(`Failed to delete asset: ${deleteError.message}`, 500);
    }

    // 6. 可选：删除 Blob Storage 中的文件
    if (delete_file && asset.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('digital_heirloom_assets')
        .remove([asset.storage_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // 不阻断流程，仅记录错误
      }
    }

    // 7. 记录删除操作日志
    try {
      const { getUuid } = await import('@/shared/lib/hash');
      await supabase.from('service_logs').insert({
        id: getUuid(),
        vault_id: vault.id,
        action_type: 'asset_deleted',
        actor_id: user.id,
        actor_email: user.email,
        action_data: {
          asset_id,
          storage_path: asset.storage_path,
          delete_file: delete_file || false,
        },
        result: 'success',
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      // 日志记录失败不影响主流程
      console.error('Log error:', logError);
    }

    return respData({
      message: 'Asset deleted successfully',
      asset_id,
    });
  } catch (error) {
    console.error('Delete asset error:', error);
    return respErr(error instanceof Error ? error.message : 'Internal server error', 500);
  }
}

