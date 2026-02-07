/**
 * API Route: 获取资产列表
 * 功能：
 * - 查询用户保险箱的所有资产
 * - 支持分类筛选
 * - 返回元数据（不包含文件内容）
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { respData, respErr } from '@/shared/lib/resp';
import { requireAuth } from '@/shared/lib/api-auth';
import { findDigitalVaultByUserId } from '@/shared/models/digital-vault';

export async function GET(request: NextRequest) {
  let user: { id: string } | null = null;
  let vault: { id: string } | null = null;
  
  try {
    // 1. 身份验证
    const authResult = await requireAuth();
    if (authResult.error) {
      return authResult.error;
    }
    user = authResult.user;

    // 2. 获取用户的保险箱
    vault = await findDigitalVaultByUserId(user.id);
    if (!vault) {
      return respErr('Vault not found. Please initialize your vault first.', 404);
    }

    // 3. 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category'); // 可选：secure_keys, legal_docs, video_legacy, instructions
    const status = searchParams.get('status') || 'active'; // 默认：active

    // 4. 检查 Supabase 环境变量
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase environment variables not configured, returning empty assets list');
      return respData({
        assets: [],
        total: 0,
        vault_id: vault.id,
        message: 'Assets storage not configured yet',
      });
    }

    // 5. 查询资产列表（容错处理：即使表不存在也返回空数组）
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      let query = supabase
        .from('vault_assets')
        .select('id, file_name, display_name, file_type, file_size, category, version, status, created_at, updated_at')
        .eq('vault_id', vault.id)
        .eq('status', status)
        .order('created_at', { ascending: false });

      // 6. 应用分类筛选
      if (category) {
        query = query.eq('category', category);
      }

      const { data: assets, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        // 如果表不存在或其他数据库错误，返回空数组（容错处理）
        if (
          error.message?.includes('does not exist') ||
          error.message?.includes('relation') ||
          error.message?.includes('table') ||
          error.message?.includes('permission denied') ||
          error.code === 'PGRST116' // PostgREST: relation not found
        ) {
          console.warn('vault_assets table does not exist or not accessible, returning empty array');
          return respData({
            assets: [],
            total: 0,
            vault_id: vault.id,
            message: 'Assets table not initialized yet',
          });
        }
        // 其他错误也返回空数组，确保页面正常显示
        console.warn('Assets query failed, returning empty array:', error.message);
        return respData({
          assets: [],
          total: 0,
          vault_id: vault.id,
        });
      }

      // 7. 格式化响应数据
      const formattedAssets = (assets || []).map((asset) => ({
        id: asset.id,
        file_name: asset.file_name,
        display_name: asset.display_name,
        file_type: asset.file_type,
        file_size: asset.file_size,
        category: asset.category,
        version: asset.version,
        status: asset.status,
        created_at: asset.created_at,
        updated_at: asset.updated_at,
        // ⚠️ 不返回文件内容、加密参数或存储路径（安全考虑）
      }));

      return respData({
        assets: formattedAssets,
        total: formattedAssets.length,
        vault_id: vault.id,
      });
    } catch (supabaseError: any) {
      // Supabase 客户端初始化失败或其他异常，返回空数组
      console.error('Supabase client initialization or query failed:', supabaseError);
      return respData({
        assets: [],
        total: 0,
        vault_id: vault.id,
      });
    }

  } catch (error) {
    // 最外层错误处理：确保即使发生意外错误也返回空数组，而不是 500
    console.error('List assets error:', error);
    // 返回空数组而不是错误，确保页面正常显示
    return respData({
      assets: [],
      total: 0,
      vault_id: vault?.id || null, // 使用 vault.id 作为 fallback，如果未定义则使用 null
    });
  }
}

