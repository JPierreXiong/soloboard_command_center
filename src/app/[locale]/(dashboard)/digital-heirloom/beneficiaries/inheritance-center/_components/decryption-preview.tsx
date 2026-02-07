/**
 * Decryption Preview Component
 * 解密后的预览模式组件（Free 用户）
 * 显示资产摘要和遮盖显示，引导付费
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Eye, EyeOff, Download, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { UpgradePrompt } from '@/shared/components/digital-heirloom/upgrade-prompt';

interface DecryptionPreviewProps {
  decryptedData: any; // 解密后的数据
  vaultPlanLevel: 'free' | 'base' | 'pro';
  remainingAttempts: number | null;
  isLimitReached: boolean;
  onUpgrade?: () => void;
}

interface AssetSummary {
  bankAccounts: number;
  socialMedia: number;
  files: number;
  other: number;
}

export function DecryptionPreview({
  decryptedData,
  vaultPlanLevel,
  remainingAttempts,
  isLimitReached,
  onUpgrade,
}: DecryptionPreviewProps) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [assetSummary, setAssetSummary] = useState<AssetSummary>({
    bankAccounts: 0,
    socialMedia: 0,
    files: 0,
    other: 0,
  });
  const [fileList, setFileList] = useState<Array<{ name: string; size: number; type: string; content?: any }>>([]);

  useEffect(() => {
    // 解析解密后的数据，统计资产类型
    if (decryptedData) {
      const summary: AssetSummary = {
        bankAccounts: 0,
        socialMedia: 0,
        files: 0,
        other: 0,
      };
      const files: Array<{ name: string; size: number; type: string; content?: any }> = [];

      // 如果 decryptedData 是对象
      if (typeof decryptedData === 'object' && decryptedData !== null) {
        // 检查是否有 assets 数组
        if (Array.isArray(decryptedData.assets)) {
          decryptedData.assets.forEach((asset: any) => {
            if (asset.type === 'bank_account' || asset.type === 'bank') {
              summary.bankAccounts++;
            } else if (asset.type === 'social_media' || asset.type === 'social') {
              summary.socialMedia++;
            } else if (asset.type === 'file' || asset.type === 'document') {
              summary.files++;
            } else {
              summary.other++;
            }

            files.push({
              name: asset.name || asset.platform || 'Unknown',
              size: asset.size || 0,
              type: asset.type || 'other',
              content: asset,
            });
          });
        } else {
          // 如果不是标准格式，尝试解析
          Object.keys(decryptedData).forEach((key) => {
            if (key.toLowerCase().includes('bank') || key.toLowerCase().includes('account')) {
              summary.bankAccounts++;
            } else if (key.toLowerCase().includes('social') || key.toLowerCase().includes('media')) {
              summary.socialMedia++;
            } else {
              summary.other++;
            }
          });
        }
      }

      setAssetSummary(summary);
      setFileList(files);
    }
  }, [decryptedData]);

  // Free 用户且次数用尽时，3 秒后自动跳转
  useEffect(() => {
    if (isLimitReached && vaultPlanLevel === 'free') {
      const timer = setTimeout(() => {
        router.push('/pricing?upgrade=base&reason=decryption_limit_reached');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isLimitReached, vaultPlanLevel, router]);

  const maskSensitiveInfo = (text: string): string => {
    if (!text || text.length <= 4) {
      return '****';
    }
    return '****' + text.slice(-4);
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/pricing?upgrade=base&reason=decryption_limit_reached');
    }
  };

  const totalAssets = assetSummary.bankAccounts + assetSummary.socialMedia + assetSummary.files + assetSummary.other;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      {/* 成功提示 */}
      <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
        <Shield className="w-6 h-6" />
        <h2 className="text-2xl font-bold">✅ 解密成功！</h2>
      </div>

      {/* 资产摘要 */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          📊 资产摘要
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {assetSummary.bankAccounts > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {assetSummary.bankAccounts}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">银行账号</div>
            </div>
          )}
          {assetSummary.socialMedia > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {assetSummary.socialMedia}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">社交媒体</div>
            </div>
          )}
          {assetSummary.files > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {assetSummary.files}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">文件</div>
            </div>
          )}
          {assetSummary.other > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {assetSummary.other}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">其他</div>
            </div>
          )}
        </div>
      </div>

      {/* 文件列表（预览） */}
      {fileList.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Download className="w-5 h-5" />
            📄 文件列表（预览）
          </h3>
          <div className="space-y-2">
            {fileList.slice(0, 5).map((file, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{file.name}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {file.size > 0 ? `${(file.size / 1024).toFixed(2)} KB` : 'N/A'}
                  </span>
                </div>
                {file.content && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {file.content.account && (
                      <div>Account: {maskSensitiveInfo(String(file.content.account))}</div>
                    )}
                    {file.content.password && (
                      <div>Password: ****</div>
                    )}
                    {file.content.username && (
                      <div>Username: {maskSensitiveInfo(String(file.content.username))}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Free 计划限制提示 - 使用 UpgradePrompt 组件 */}
      {vaultPlanLevel === 'free' && isLimitReached && (
        <UpgradePrompt
          reason="decryption_limit"
          currentPlan="free"
          currentUsage={{
            decryptionAttempts: (remainingAttempts ?? 0) + 1, // 已使用次数
          }}
          limits={{
            decryptionAttempts: 1,
          }}
          asDialog={false}
        />
      )}

      {/* 解密次数提示 */}
      {vaultPlanLevel === 'free' && remainingAttempts !== null && remainingAttempts > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            ⚠️ 您还有 <strong>{remainingAttempts}</strong> 次解密机会。升级到 Base/Pro 可享受无限次解密。
          </p>
        </div>
      )}
    </div>
  );
}
