/**
 * 升级提示弹窗组件
 * 功能：
 * - Free 用户尝试使用 Pro 功能时显示
 * - 显示功能对比
 * - 跳转到定价页面
 */

'use client';

import { X, Check, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpgradeModalProps {
  feature: string;
  isOpen: boolean;
  onClose: () => void;
}

const PRO_FEATURES = [
  '2GB Encrypted Storage',
  'Video Legacy Support',
  'Physical Recovery Kit',
  'Priority Support',
  'Advanced Security Features',
];

export function UpgradeModal({ feature, isOpen, onClose }: UpgradeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    router.push('/pricing');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Pro Feature
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            <span className="font-semibold text-gray-900 dark:text-white">{feature}</span> is a
            Pro-only feature. Upgrade to unlock:
          </p>

          <ul className="space-y-2">
            {PRO_FEATURES.map((item) => (
              <li key={item} className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
}



