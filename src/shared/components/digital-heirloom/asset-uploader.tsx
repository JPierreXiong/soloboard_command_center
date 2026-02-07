/**
 * 资产上传组件
 * 功能：
 * - 文件选择（支持拖拽）
 * - 主密码输入
 * - 客户端加密
 * - 文件大小校验（按套餐）
 * - 权限拦截（Free → Pro 升级提示）
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { encryptFile } from '@/shared/lib/file-encryption';
import { checkFeatureAccess } from '@/shared/lib/feature-access';

// 安全获取 Supabase 环境变量（客户端）
const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 环境变量未配置:', {
      url: supabaseUrl ? '✅' : '❌',
      key: supabaseKey ? '✅' : '❌',
    });
    throw new Error('Supabase configuration is missing. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
  }

  return { supabaseUrl, supabaseKey };
};

const { supabaseUrl, supabaseKey } = getSupabaseConfig();
const supabase = createClient(supabaseUrl, supabaseKey);

export type AssetCategory = 'secure_keys' | 'legal_docs' | 'video_legacy' | 'instructions';

interface AssetUploaderProps {
  vaultId: string;
  category: AssetCategory;
  userPlan: 'free' | 'pro' | 'on_demand';
  onUploadComplete: (assetId: string) => void;
  onError?: (error: Error) => void;
}

// 文件大小限制（按套餐）
const FILE_SIZE_LIMITS = {
  free: 10 * 1024, // 10KB
  pro: 2 * 1024 * 1024 * 1024, // 2GB
  on_demand: 2 * 1024 * 1024 * 1024, // 2GB
};

// 允许的文件类型（按分类）
const ALLOWED_FILE_TYPES: Record<AssetCategory, string[]> = {
  secure_keys: ['text/plain'],
  legal_docs: ['application/pdf', 'image/jpeg', 'image/png'],
  video_legacy: ['video/mp4', 'video/webm', 'video/quicktime'],
  instructions: ['text/plain'],
};

export function AssetUploader({
  vaultId,
  category,
  userPlan,
  onUploadComplete,
  onError,
}: AssetUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [masterPassword, setMasterPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 权限检查
  const checkAccess = useCallback(() => {
    // 视频遗嘱仅 Pro 版可用
    if (category === 'video_legacy' && userPlan === 'free') {
      toast.error('视频遗嘱功能需要 Pro 版');
      // TODO: 显示升级提示弹窗
      return false;
    }
    return true;
  }, [category, userPlan]);

  // 文件大小检查
  const checkFileSize = useCallback((file: File) => {
    const maxSize = FILE_SIZE_LIMITS[userPlan];
    if (file.size > maxSize) {
      toast.error(
        `文件大小超过限制（${userPlan === 'free' ? '10KB' : '2GB'}）。请升级到 Pro 版以上传大文件。`
      );
      // TODO: 显示升级提示弹窗
      return false;
    }
    return true;
  }, [userPlan]);

  // 文件类型检查
  const checkFileType = useCallback((file: File) => {
    const allowedTypes = ALLOWED_FILE_TYPES[category];
    if (!allowedTypes.includes(file.type)) {
      toast.error(`不支持的文件类型。允许的类型：${allowedTypes.join(', ')}`);
      return false;
    }
    return true;
  }, [category]);

  // 处理文件上传
  const handleFileUpload = useCallback(async (file: File) => {
    // 1. 权限检查
    if (!checkAccess()) {
      return;
    }

    // 2. 文件大小检查
    if (!checkFileSize(file)) {
      return;
    }

    // 3. 文件类型检查
    if (!checkFileType(file)) {
      return;
    }

    // 4. 要求输入主密码
    if (!masterPassword) {
      setShowPasswordInput(true);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 5. 客户端加密（使用流式加密，支持 2GB 大文件）
      const fileId = crypto.randomUUID();
      
      // 对于大文件（> 50MB），使用流式加密上传
      let encryptedResult;
      if (file.size > 50 * 1024 * 1024) {
        // 使用流式加密上传
        const { streamEncryptAndUpload } = await import('@/shared/lib/streaming-crypto-helper');
        encryptedResult = await streamEncryptAndUpload({
          file,
          masterPassword,
          vaultId,
          fileId,
          onProgress: (progress) => {
            setUploadProgress(progress.percentage);
          },
        });
      } else {
        // 小文件使用普通加密
        const { encryptFile } = await import('@/shared/lib/file-encryption');
        const encryptResult = await encryptFile(file, masterPassword, (progress) => {
          setUploadProgress(progress.percentage);
        });
        
        // 上传到 Blob Storage
        const storagePath = `${vaultId}/${fileId}_${file.name}.enc`;
        // 将 Uint8Array 转换为 Blob（使用类型断言解决 TypeScript 类型兼容性问题）
        const encryptedBlob = new Blob([encryptResult.encryptedData as BlobPart], {
          type: 'application/octet-stream',
        });

        const { error: uploadError } = await supabase.storage
          .from('digital_heirloom_assets')
          .upload(storagePath, encryptedBlob, {
            contentType: 'application/octet-stream',
            upsert: false,
            cacheControl: '3600',
          });

        if (uploadError) {
          throw new Error(`文件上传到 Blob Storage 失败: ${uploadError.message}`);
        }

        encryptedResult = {
          storagePath,
          salt: encryptResult.salt,
          iv: encryptResult.iv,
          checksum: encryptResult.checksum,
          fileSize: file.size,
        };
      }

      // 7. 【关键步骤】调用 API 保存元数据到 PostgreSQL 数据库
      // ⚠️ 重要：只存储元数据（路径、大小、加密参数），不存储文件内容
      // ⚠️ 核心原则：不改变 ShipAny 结构，文件存储在 Blob Storage
      const uploadResponse = await fetch('/api/digital-heirloom/assets/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storage_path: encryptedResult.storagePath,
          file_name: file.name,
          display_name: file.name,
          file_type: file.type,
          file_size: encryptedResult.fileSize,
          encryption_salt: encryptedResult.salt,
          encryption_iv: encryptedResult.iv,
          checksum: encryptedResult.checksum,
          category,
        }),
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResult.code !== 200) {
        throw new Error(uploadResult.message || '保存元数据失败');
      }

      toast.success('文件上传成功');
      onUploadComplete(uploadResult.data.id);
      
      // 重置状态
      setMasterPassword('');
      setShowPasswordInput(false);
      setUploadProgress(0);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('上传失败');
      toast.error(err.message);
      onError?.(err);
    } finally {
      setIsUploading(false);
    }
  }, [vaultId, category, masterPassword, checkAccess, checkFileSize, checkFileType, onUploadComplete, onError]);

  // Dropzone 配置
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFileUpload(acceptedFiles[0]);
    }
  }, [handleFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_FILE_TYPES[category].reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="space-y-4">
      {/* 主密码输入（如果需要） */}
      {showPasswordInput && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            请输入主密码以加密文件
          </label>
          <input
            type="password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="主密码"
            autoFocus
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                setMasterPassword('');
                setShowPasswordInput(false);
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              取消
            </button>
            <button
              onClick={() => {
                if (masterPassword) {
                  // 重新触发上传
                  const file = fileInputRef.current?.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }
              }}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              确认
            </button>
          </div>
        </div>
      )}

      {/* 上传区域 */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        {isUploading ? (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">上传中...</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">{uploadProgress}%</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">📁</div>
            <div className="text-sm font-medium text-gray-700">
              {isDragActive ? '松开以上传文件' : '点击或拖拽文件到此处上传'}
            </div>
            <div className="text-xs text-gray-500">
              支持: {ALLOWED_FILE_TYPES[category].join(', ')}
            </div>
            <div className="text-xs text-gray-500">
              最大大小: {userPlan === 'free' ? '10KB' : '2GB'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

