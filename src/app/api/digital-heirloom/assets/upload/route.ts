/**
 * API Route: 上传资产
 * 功能：
 * - 接收客户端加密后的文件
 * - 上传到 Supabase Storage (Blob Storage)
 * - 保存元数据到数据库
 * 
 * 核心原则：不改变 ShipAny 结构，文件存储在 Blob Storage
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { findDigitalVaultByUserId } from '@/shared/models/digital-vault';
import { getUuid } from '@/shared/lib/hash';

const BUCKET_NAME = 'digital_heirloom_assets';

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
      storage_path,
      file_name,
      display_name,
      file_type,
      file_size,
      encryption_salt,
      encryption_iv,
      checksum,
      category,
    } = body;

    // 4. 验证必需字段
    if (!storage_path || !file_name || !file_type || !file_size || !encryption_salt || !encryption_iv || !checksum || !category) {
      return respErr('Missing required fields', 400);
    }

    // 5. 验证分类
    const validCategories = ['secure_keys', 'legal_docs', 'video_legacy', 'instructions'];
    if (!validCategories.includes(category)) {
      return respErr(`Invalid category. Must be one of: ${validCategories.join(', ')}`, 400);
    }

    // 6. 验证文件大小（按套餐）
    // TODO: 获取用户套餐信息
    const userPlan = 'pro'; // 临时值，需要从数据库查询
    const maxSize = userPlan === 'pro' ? 2 * 1024 * 1024 * 1024 : 10 * 1024; // 2GB or 10KB
    if (file_size > maxSize) {
      return respErr(`File size exceeds limit (${userPlan === 'pro' ? '2GB' : '10KB'})`, 400);
    }

    // 7. 验证 Storage 路径格式
    const pathParts = storage_path.split('/');
    if (pathParts.length !== 2 || pathParts[0] !== vault.id) {
      return respErr('Invalid storage path format', 400);
    }

    // 8. 验证文件是否已存在于 Storage（通过检查数据库记录）
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existingAsset } = await supabase
      .from('vault_assets')
      .select('id')
      .eq('storage_path', storage_path)
      .single();

    if (existingAsset) {
      return respErr('File already exists', 409);
    }

    // 9. 保存元数据到数据库（不存储文件内容）
    const assetId = getUuid();
    const { data: assetData, error: dbError } = await supabase
      .from('vault_assets')
      .insert({
        id: assetId,
        vault_id: vault.id,
        file_name,
        display_name: display_name || file_name,
        file_type,
        file_size,
        storage_path, // ⚠️ 只存储路径引用，不存储文件内容
        encryption_salt, // 加密参数
        encryption_iv, // 加密参数
        checksum, // 校验和
        category,
        version: 1,
        status: 'active',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return respErr(`Failed to save asset metadata: ${dbError.message}`, 500);
    }

    // 10. 返回成功响应
    return respData({
      id: assetData.id,
      storage_path: assetData.storage_path,
      message: 'Asset metadata saved successfully. File should be uploaded to Blob Storage separately.',
    });
  } catch (error) {
    console.error('Upload asset error:', error);
    return respErr(error instanceof Error ? error.message : 'Internal server error', 500);
  }
}

