/**
 * Digital Heirloom Settings 页面
 * 设置页面
 */

'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, Clock, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface DeadManSwitchSettings {
  enabled: boolean;
  heartbeatFrequency: number; // 天数
  gracePeriod: number; // 天数
}

export default function DigitalHeirloomSettingsPage() {
  const [settings, setSettings] = useState<DeadManSwitchSettings>({
    enabled: true,
    heartbeatFrequency: 90,
    gracePeriod: 7,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vaultId, setVaultId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/digital-heirloom/vault/get');
      const result = await response.json();

      if (result.code !== 200 || !result.data?.vault) {
        toast.error('保险箱未找到，请先创建保险箱');
        return;
      }

      const vault = result.data.vault;
      setVaultId(vault.id);

      setSettings({
        enabled: vault.deadManSwitchEnabled || false,
        heartbeatFrequency: vault.heartbeatFrequency || 90,
        gracePeriod: vault.gracePeriod || 7,
      });
    } catch (error) {
      console.error('加载设置失败:', error);
      toast.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/digital-heirloom/vault/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          heartbeatFrequency: settings.heartbeatFrequency,
          gracePeriod: settings.gracePeriod,
          deadManSwitchEnabled: settings.enabled,
        }),
      });

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(result.message || '保存设置失败');
      }

      toast.success('设置已保存');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure your digital legacy protection settings
          </p>
        </div>

        {/* Dead Man's Switch 设置 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start space-x-4 mb-6">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Dead Man's Switch
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically release your digital legacy if you don't check in for a specified period
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* 启用开关 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Enable Dead Man's Switch
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  When enabled, your assets will be released to beneficiaries if you don't check in
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.enabled && (
              <>
                {/* 心跳频率 */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Heartbeat Frequency</span>
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    How often you need to check in (in days)
                  </p>
                  <input
                    type="number"
                    min="30"
                    max="365"
                    value={settings.heartbeatFrequency}
                    onChange={(e) => setSettings({ ...settings, heartbeatFrequency: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 90 days
                  </p>
                </div>

                {/* 宽限期 */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Grace Period</span>
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Warning period before assets are released (in days)
                  </p>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.gracePeriod}
                    onChange={(e) => setSettings({ ...settings, gracePeriod: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 7 days
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 安全设置 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start space-x-4 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Security Settings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your data is encrypted with zero-knowledge encryption
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Encryption Method
                </p>
                <p className="text-xs text-gray-500">AES-256-GCM</p>
              </div>
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Zero-Knowledge Proof
                </p>
                <p className="text-xs text-gray-500">Server cannot access your data</p>
              </div>
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                Enabled
              </span>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

