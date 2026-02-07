/**
 * API Route: 更新资产
 * 功能：
 * - 更新资产元数据
 * - 创建新版本记录
 * - 检测是否需要物理同步
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
    const {
      asset_id,
      display_name,
      storage_path, // 新版本的存储路径
      encryption_salt,
      encryption_iv,
      checksum,
      file_size,
      change_description,
    } = body;

    if (!asset_id) {
      return respErr('Asset ID is required', 400);
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 4. 查询现有资产
    const { data: existingAsset, error: fetchError } = await supabase
      .from('vault_assets')
      .select('*')
      .eq('id', asset_id)
      .eq('vault_id', vault.id)
      .single();

    if (fetchError || !existingAsset) {
      return respErr('Asset not found', 404);
    }

    // 5. 检查是否是核心密钥更新（需要物理同步）
    const isCoreKeyUpdate = existingAsset.category === 'secure_keys';
    const newVersion = existingAsset.version + 1;

    // 6. 更新资产元数据
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (display_name) updateData.display_name = display_name;
    if (storage_path) updateData.storage_path = storage_path;
    if (encryption_salt) updateData.encryption_salt = encryption_salt;
    if (encryption_iv) updateData.encryption_iv = encryption_iv;
    if (checksum) updateData.checksum = checksum;
    if (file_size) updateData.file_size = file_size;
    if (newVersion) updateData.version = newVersion;

    const { data: updatedAsset, error: updateError } = await supabase
      .from('vault_assets')
      .update(updateData)
      .eq('id', asset_id)
      .eq('vault_id', vault.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return respErr(`Failed to update asset: ${updateError.message}`, 500);
    }

    // 7. 保存版本历史（如果提供了新存储路径）
    if (storage_path && existingAsset.storage_path !== storage_path) {
      await supabase.from('vault_asset_versions').insert({
        id: crypto.randomUUID(),
        asset_id: asset_id,
        version: existingAsset.version, // 旧版本号
        storage_path: existingAsset.storage_path, // 旧路径
        checksum: existingAsset.checksum,
        file_size: existingAsset.file_size,
        change_description: change_description || `Updated to version ${newVersion}`,
      });
    }

    // 8. 检查物理同步状态（如果是核心密钥更新）
    let physicalSyncRequired = false;
    if (isCoreKeyUpdate) {
      // TODO: 检查物理同步状态
      // 如果物理包已生成且未同步，标记为需要重新同步
      physicalSyncRequired = true;
    }

    return respData({
      asset: updatedAsset,
      version: newVersion,
      physical_sync_required: physicalSyncRequired,
      message: physicalSyncRequired
        ? 'Asset updated. Physical recovery kit needs to be re-synced.'
        : 'Asset updated successfully.',
    });
  } catch (error) {
    console.error('Update asset error:', error);
    return respErr(error instanceof Error ? error.message : 'Internal server error', 500);
  }
}

