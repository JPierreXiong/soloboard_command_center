/**
 * 物理同步检测器
 * 功能：
 * - 检测核心密钥文件是否被更新
 * - 标记物理恢复包状态（outdated）
 * - UI 警告提示
 * 
 * 核心原则：不改变 ShipAny 结构，仅处理物理同步状态管理
 */

import { createClient } from '@supabase/supabase-js';

export type PhysicalSyncStatus = 'synced' | 'outdated' | 'pending';

/**
 * 检查物理同步状态
 * 
 * 逻辑：
 * 1. 查询标记为"核心密钥"的文件
 * 2. 检查是否有新版本
 * 3. 如果有新版本且物理包未更新，标记为 outdated
 */
export async function checkPhysicalSyncStatus(
  vaultId: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{
  status: PhysicalSyncStatus;
  lastSyncedAt?: string;
  outdatedAssets?: Array<{ id: string; name: string; version: number }>;
}> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // 1. 查询核心密钥文件（secure_keys 类别）
  const { data: assets, error } = await supabase
    .from('vault_assets')
    .select('id, file_name, version, updated_at, category')
    .eq('vault_id', vaultId)
    .eq('category', 'secure_keys')
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`查询资产失败: ${error.message}`);
  }

  // 2. 查询物理同步记录（从 digital_vaults 表或单独的 physical_sync_logs 表）
  // 注意：这里假设 digital_vaults 表有 physical_sync_at 字段
  const { data: vault, error: vaultError } = await supabase
    .from('digital_vaults')
    .select('physical_sync_at')
    .eq('id', vaultId)
    .single();

  if (vaultError) {
    throw new Error(`查询保险箱失败: ${vaultError.message}`);
  }

  const lastSyncedAt = vault?.physical_sync_at;

  // 3. 检查是否有文件在物理同步后更新
  const outdatedAssets: Array<{ id: string; name: string; version: number }> = [];

  if (lastSyncedAt) {
    for (const asset of assets || []) {
      const assetUpdatedAt = new Date(asset.updated_at);
      const syncAt = new Date(lastSyncedAt);

      if (assetUpdatedAt > syncAt) {
        outdatedAssets.push({
          id: asset.id,
          name: asset.file_name,
          version: asset.version,
        });
      }
    }
  }

  // 4. 确定状态
  let status: PhysicalSyncStatus = 'synced';
  if (!lastSyncedAt) {
    status = 'pending'; // 从未同步过
  } else if (outdatedAssets.length > 0) {
    status = 'outdated'; // 有文件已更新但物理包未同步
  }

  return {
    status,
    lastSyncedAt: lastSyncedAt || undefined,
    outdatedAssets: outdatedAssets.length > 0 ? outdatedAssets : undefined,
  };
}

/**
 * 标记物理同步完成
 * 当用户重新打印物理恢复包后调用
 */
export async function markPhysicalSyncComplete(
  vaultId: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase
    .from('digital_vaults')
    .update({
      physical_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', vaultId);

  if (error) {
    throw new Error(`更新物理同步时间失败: ${error.message}`);
  }
}

/**
 * 获取物理同步警告消息
 */
export function getPhysicalSyncWarningMessage(
  status: PhysicalSyncStatus,
  outdatedAssets?: Array<{ id: string; name: string; version: number }>
): string | null {
  switch (status) {
    case 'pending':
      return '您尚未生成物理恢复包。建议立即生成以确保资产安全。';
    case 'outdated':
      if (outdatedAssets && outdatedAssets.length > 0) {
        const assetNames = outdatedAssets.map(a => a.name).join('、');
        return `以下核心密钥已更新，物理恢复包已失效：${assetNames}。请重新申请物理同步。`;
      }
      return '物理恢复包已失效，请重新申请物理同步。';
    case 'synced':
      return null;
    default:
      return null;
  }
}



