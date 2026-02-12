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
        throw new Error(result.error || 'Failed to add site');
      }

      toast.success('Site added successfully!');
      resetForm();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add site');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 验证配置是否完整
  const isConfigValid = () => {
    if (!name || !url) return false;
    
    switch (platform) {
      case 'GA4':
        return !!config.propertyId && !!config.credentials;
      case 'STRIPE':
        return !!config.secretKey;
      case 'UPTIME':
        return true; // 只需要 URL
      case 'LEMON_SQUEEZY':
        return !!config.apiKey && !!config.storeId;
      case 'SHOPIFY':
        return !!config.shopDomain && !!config.accessToken;
      default:
        return false;
    }
  };

  // 构建配置对象
  const buildConfig = () => {
    switch (platform) {
      case 'GA4':
        // 验证 JSON 格式
        try {
          const credentials = JSON.parse(config.credentials);
          return {
            ga4: {
              propertyId: config.propertyId,
              credentials: credentials,
            },
          };
        } catch (e) {
          throw new Error('Invalid Service Account JSON format');
        }
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
        Select Platform
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: 'UPTIME', name: 'Uptime Monitoring', icon: '🟢', desc: 'Website online status' },
          { id: 'GA4', name: 'Google Analytics', icon: '📊', desc: 'Website traffic analysis' },
          { id: 'STRIPE', name: 'Stripe', icon: '💳', desc: 'Payment and revenue' },
          { id: 'LEMON_SQUEEZY', name: 'Lemon Squeezy', icon: '🍋', desc: 'Digital product sales' },
          { id: 'SHOPIFY', name: 'Shopify', icon: '🛍️', desc: 'E-commerce platform' },
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
        Next
      </button>
    </div>
  );

  // 渲染配置表单
  const renderConfigForm = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Configure Site
      </h3>

      {/* 基本信息 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Site Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., My AI Tool"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Website URL
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
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
              <strong>How to get GA4 credentials:</strong>
            </p>
            <ol className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-decimal list-inside">
              <li>Go to Google Cloud Console → Create Service Account</li>
              <li>Enable Google Analytics Data API</li>
              <li>Download JSON key file</li>
              <li>In GA4, add service account email to property users</li>
            </ol>
          </div>
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
            <p className="text-xs text-gray-500 mt-1">Find in GA4: Admin → Property Settings → Property ID</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Service Account JSON
            </label>
            <textarea
              value={config.credentials || ''}
              onChange={(e) => setConfig({ ...config, credentials: e.target.value })}
              placeholder='{"type": "service_account", "project_id": "...", "private_key": "..."}'
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-xs"
            />
            <p className="text-xs text-gray-500 mt-1">Paste the entire JSON content from downloaded key file</p>
          </div>
        </>
      )}

      {platform === 'STRIPE' && (
        <>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
              <strong>How to get Stripe API keys:</strong>
            </p>
            <ol className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-decimal list-inside">
              <li>Go to Stripe Dashboard → Developers → API keys</li>
              <li>Copy "Secret key" (starts with sk_live_ or sk_test_)</li>
              <li>Optionally copy "Publishable key" for additional features</li>
            </ol>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Secret Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={config.secretKey || ''}
              onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
              placeholder="sk_test_... or sk_live_..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Required to fetch payment data</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Publishable Key (Optional)
            </label>
            <input
              type="text"
              value={config.publishableKey || ''}
              onChange={(e) => setConfig({ ...config, publishableKey: e.target.value })}
              placeholder="pk_test_... or pk_live_..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </>
      )}

      {platform === 'UPTIME' && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
            ✅ Simple Setup - No API Keys Required!
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">
            Uptime monitoring only needs your website URL. We'll check if your site is online every few minutes and alert you if it goes down.
          </p>
        </div>
      )}

      {platform === 'LEMON_SQUEEZY' && (
        <>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
              <strong>How to get Lemon Squeezy credentials:</strong>
            </p>
            <ol className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-decimal list-inside">
              <li>Go to Lemon Squeezy → Settings → API</li>
              <li>Create a new API key</li>
              <li>Find your Store ID in Settings → Stores</li>
            </ol>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={config.apiKey || ''}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="Your Lemon Squeezy API key"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Store ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.storeId || ''}
              onChange={(e) => setConfig({ ...config, storeId: e.target.value })}
              placeholder="12345"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </>
      )}

      {platform === 'SHOPIFY' && (
        <>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
              <strong>How to get Shopify credentials:</strong>
            </p>
            <ol className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-decimal list-inside">
              <li>Go to Shopify Admin → Apps → Develop apps</li>
              <li>Create a custom app with Admin API access</li>
              <li>Enable "read_orders" and "read_products" permissions</li>
              <li>Copy the Admin API access token</li>
            </ol>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Shop Domain <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.shopDomain || ''}
              onChange={(e) => setConfig({ ...config, shopDomain: e.target.value })}
              placeholder="your-store.myshopify.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Your Shopify store domain (e.g., mystore.myshopify.com)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Admin API Access Token <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={config.accessToken || ''}
              onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
              placeholder="shpat_..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </>
      )}

      {/* 按钮 */}
      <div className="flex space-x-3">
        <button
          onClick={() => setStep(1)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !isConfigValid()}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Site'
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
            Add Monitoring Site
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











