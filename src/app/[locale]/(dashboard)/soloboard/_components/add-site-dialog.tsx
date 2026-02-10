/**
 * SoloBoard - 添加站点对话框
 * 
 * 支持添加 GA4, Stripe, Uptime 等平台
 */

'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddSiteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Platform = 'GA4' | 'STRIPE' | 'UPTIME' | 'LEMON_SQUEEZY' | 'SHOPIFY';

export function AddSiteDialog({ open, onClose, onSuccess }: AddSiteDialogProps) {
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState<Platform>('UPTIME');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [config, setConfig] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  // 重置表单
  const resetForm = () => {
    setStep(1);
    setPlatform('UPTIME');
    setName('');
    setUrl('');
    setConfig({});
  };

  // 提交表单
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/soloboard/sites/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          url,
          platform,
          config: buildConfig(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || '添加失败');
      }

      toast.success('站点添加成功！');
      resetForm();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '添加失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 构建配置对象
  const buildConfig = () => {
    switch (platform) {
      case 'GA4':
        return {
          ga4: {
            propertyId: config.propertyId,
            credentials: config.credentials,
          },
        };
      case 'STRIPE':
        return {
          stripe: {
            secretKey: config.secretKey,
            publishableKey: config.publishableKey,
          },
        };
      case 'UPTIME':
        return {
          uptime: {
            url: url || config.url,
          },
        };
      case 'LEMON_SQUEEZY':
        return {
          lemonSqueezy: {
            apiKey: config.apiKey,
            storeId: config.storeId,
          },
        };
      case 'SHOPIFY':
        return {
          shopify: {
            shopDomain: config.shopDomain,
            accessToken: config.accessToken,
          },
        };
      default:
        return {};
    }
  };

  // 渲染平台选择
  const renderPlatformSelect = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        选择平台
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: 'UPTIME', name: 'Uptime 监控', icon: '🟢', desc: '网站在线状态' },
          { id: 'GA4', name: 'Google Analytics', icon: '📊', desc: '网站流量分析' },
          { id: 'STRIPE', name: 'Stripe', icon: '💳', desc: '支付和收入' },
          { id: 'LEMON_SQUEEZY', name: 'Lemon Squeezy', icon: '🍋', desc: '数字产品销售' },
          { id: 'SHOPIFY', name: 'Shopify', icon: '🛍️', desc: '电商平台' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id as Platform)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              platform === p.id
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="text-2xl mb-2">{p.icon}</div>
            <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{p.desc}</div>
          </button>
        ))}
      </div>
      <button
        onClick={() => setStep(2)}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        下一步
      </button>
    </div>
  );

  // 渲染配置表单
  const renderConfigForm = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        配置站点
      </h3>

      {/* 基本信息 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          站点名称
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：我的 AI 工具"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          网站地址
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* 平台特定配置 */}
      {platform === 'GA4' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Property ID
            </label>
            <input
              type="text"
              value={config.propertyId || ''}
              onChange={(e) => setConfig({ ...config, propertyId: e.target.value })}
              placeholder="123456789"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Service Account JSON
            </label>
            <textarea
              value={config.credentials || ''}
              onChange={(e) => setConfig({ ...config, credentials: e.target.value })}
              placeholder='{"type": "service_account", ...}'
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-xs"
            />
          </div>
        </>
      )}

      {platform === 'STRIPE' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Secret Key
            </label>
            <input
              type="password"
              value={config.secretKey || ''}
              onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
              placeholder="sk_test_..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Publishable Key (可选)
            </label>
            <input
              type="text"
              value={config.publishableKey || ''}
              onChange={(e) => setConfig({ ...config, publishableKey: e.target.value })}
              placeholder="pk_test_..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </>
      )}

      {platform === 'UPTIME' && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Uptime 监控只需要网站地址，无需额外配置。
          </p>
        </div>
      )}

      {/* 按钮 */}
      <div className="flex space-x-3">
        <button
          onClick={() => setStep(1)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          上一步
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !name || !url}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              添加中...
            </>
          ) : (
            '添加站点'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            添加监控站点
          </h2>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {step === 1 ? renderPlatformSelect() : renderConfigForm()}
        </div>
      </div>
    </div>
  );
}










