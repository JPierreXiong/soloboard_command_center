/**
 * Edge Function: 清理孤立文件
 * 功能：定期清理 Blob Storage 中的孤立文件（数据库记录已删除但文件仍在）
 * 
 * 触发方式：
 * - Cron Job（每周执行一次）
 * - 手动调用（管理员）
 * 
 * 核心原则：不改变 ShipAny 结构，仅处理文件存储清理
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('开始清理孤立文件...');

    // 1. 获取所有数据库中的 storage_path
    const { data: assets, error: dbError } = await supabase
      .from('vault_assets')
      .select('storage_path')
      .eq('status', 'active');

    if (dbError) {
      throw new Error(`查询数据库失败: ${dbError.message}`);
    }

    const validPaths = new Set(assets?.map(a => a.storage_path) || []);
    console.log(`数据库中有 ${validPaths.size} 个有效文件路径`);

    // 2. 列出 Blob Storage 中的所有文件
    const { data: files, error: listError } = await supabase.storage
      .from('digital_heirloom_assets')
      .list('', {
        limit: 1000,
        offset: 0,
      });

    if (listError) {
      throw new Error(`列出 Storage 文件失败: ${listError.message}`);
    }

    // 3. 找出孤立文件
    const orphanedFiles: string[] = [];
    
    // 递归检查所有文件
    async function checkFiles(folderPath: string = '') {
      const { data: folderFiles, error } = await supabase.storage
        .from('digital_heirloom_assets')
        .list(folderPath);

      if (error) {
        console.error(`列出文件夹 ${folderPath} 失败:`, error);
        return;
      }

      for (const file of folderFiles || []) {
        const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;
        
        if (file.id === null) {
          // 文件夹，递归检查
          await checkFiles(fullPath);
        } else {
          // 文件，检查是否是孤立文件
          if (!validPaths.has(fullPath)) {
            orphanedFiles.push(fullPath);
          }
        }
      }
    }

    await checkFiles();

    console.log(`发现 ${orphanedFiles.length} 个孤立文件`);

    // 4. 删除孤立文件
    const errors: string[] = [];
    let deleted = 0;

    for (const filePath of orphanedFiles) {
      try {
        const { error: deleteError } = await supabase.storage
          .from('digital_heirloom_assets')
          .remove([filePath]);

        if (deleteError) {
          errors.push(`${filePath}: ${deleteError.message}`);
          console.error(`删除文件 ${filePath} 失败:`, deleteError);
        } else {
          deleted++;
          console.log(`已删除孤立文件: ${filePath}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${filePath}: ${errorMsg}`);
        console.error(`删除文件 ${filePath} 失败:`, error);
      }
    }

    // 5. 记录清理结果
    const result = {
      success: true,
      deleted,
      totalOrphaned: orphanedFiles.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    console.log('清理完成:', result);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('清理孤立文件失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});



