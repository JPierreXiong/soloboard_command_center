'use client';

import { useState } from 'react';
import { useRouter } from '@/core/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Lock, Plus, Trash2, Eye, EyeOff, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { encryptData } from '@/shared/lib/encryption';

/**
 * 数字资产类型
 */
type AssetType = 'account' | 'wallet' | 'document' | 'message' | 'other';

/**
 * 数字资产数据结构
 */
interface DigitalAsset {
  id: string;
  type: AssetType;
  platform?: string;
  username?: string;
  password?: string;
  recoveryCode?: string;
  notes?: string;
}

/**
 * Step 2: 数字资产输入页面
 * 
 * 功能：
 * - 模板选择（快速开始）
 * - 结构化表单 + 自由文本
 * - 实时加密状态显示
 * - 预览功能
 */
export default function AssetsInputPage() {
  const router = useRouter();
  const t = useTranslations('digital-heirloom.setup.step2');
  
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [finalMessage, setFinalMessage] = useState('');
  const [encrypting, setEncrypting] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState<'idle' | 'ready' | 'encrypting' | 'encrypted'>('idle');

  // 从 sessionStorage 获取主密码（临时方案）
  const getMasterPassword = (): string | null => {
    if (typeof window === 'undefined') return null;
    const setupData = sessionStorage.getItem('digital-heirloom-setup');
    if (!setupData) return null;
    try {
      const data = JSON.parse(setupData);
      return data.password || null;
    } catch {
      return null;
    }
  };

  // 添加资产
  const handleAddAsset = (type: AssetType = 'account') => {
    const newAsset: DigitalAsset = {
      id: `asset-${Date.now()}`,
      type,
      platform: '',
      username: '',
      password: '',
      recoveryCode: '',
      notes: '',
    };
    setAssets([...assets, newAsset]);
    setEncryptionStatus('ready');
  };

  // 删除资产
  const handleRemoveAsset = (id: string) => {
    setAssets(assets.filter(asset => asset.id !== id));
  };

  // 更新资产
  const handleUpdateAsset = (id: string, field: keyof DigitalAsset, value: string) => {
    setAssets(assets.map(asset => 
      asset.id === id ? { ...asset, [field]: value } : asset
    ));
    setEncryptionStatus('ready');
  };

  // 加密并保存
  const handleEncryptAndSave = async () => {
    const masterPassword = getMasterPassword();
    if (!masterPassword) {
      toast.error(t('actions.error_no_password'));
      router.push('/digital-heirloom/setup/step-1-master-password');
      return;
    }

    if (assets.length === 0 && !finalMessage.trim()) {
      toast.error(t('actions.error_no_assets'));
      return;
    }

    setEncrypting(true);
    setEncryptionStatus('encrypting');

    try {
      // 构建要加密的数据
      const vaultContent = {
        assets,
        finalMessage: finalMessage.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      // 客户端加密
      const { encryptedData, salt, iv } = await encryptData(
        JSON.stringify(vaultContent),
        masterPassword
      );

      // 保存到 sessionStorage（临时，实际应通过 API 保存）
      if (typeof window !== 'undefined') {
        const setupData = JSON.parse(sessionStorage.getItem('digital-heirloom-setup') || '{}');
        setupData.step = 2;
        setupData.encryptedData = encryptedData;
        setupData.encryptionSalt = salt;
        setupData.encryptionIv = iv;
        sessionStorage.setItem('digital-heirloom-setup', JSON.stringify(setupData));
      }

      setEncryptionStatus('encrypted');
      toast.success(t('actions.success'));

      // 延迟跳转，让用户看到加密成功提示
      setTimeout(() => {
        router.push('/digital-heirloom/setup/step-3-beneficiaries');
      }, 1000);
    } catch (error) {
      console.error('Encryption failed:', error);
      toast.error('Encryption failed, please try again');
      setEncryptionStatus('ready');
    } finally {
      setEncrypting(false);
    }
  };

  // 资产类型模板
  const assetTemplates = [
    { id: 'social', type: 'account' as AssetType, label: t('templates.social'), icon: '📱' },
    { id: 'wallet', type: 'wallet' as AssetType, label: t('templates.wallet'), icon: '💰' },
    { id: 'bank', type: 'account' as AssetType, label: t('templates.bank'), icon: '💳' },
    { id: 'document', type: 'document' as AssetType, label: t('templates.document'), icon: '📄' },
    { id: 'other', type: 'other' as AssetType, label: t('templates.custom'), icon: '➕' },
  ];

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* 加密状态指示器 */}
      <Card className="mb-6 border-2 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className={`h-5 w-5 ${
                encryptionStatus === 'encrypted' ? 'text-green-600' :
                encryptionStatus === 'encrypting' ? 'text-yellow-600 animate-pulse' :
                encryptionStatus === 'ready' ? 'text-blue-600' :
                'text-gray-400'
              }`} />
              <div>
                <p className="font-medium">
                  {encryptionStatus === 'encrypted' ? t('encryption_status.encrypted') :
                   encryptionStatus === 'encrypting' ? t('encryption_status.encrypting') :
                   encryptionStatus === 'ready' ? t('encryption_status.ready') :
                   t('encryption_status.idle')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {encryptionStatus === 'encrypted' ? t('encryption_description.encrypted') :
                   encryptionStatus === 'encrypting' ? t('encryption_description.encrypting') :
                   encryptionStatus === 'ready' ? t('encryption_description.ready') :
                   t('encryption_description.idle')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 快速模板 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('quick_start.title')}</CardTitle>
          <CardDescription>{t('quick_start.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {assetTemplates.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
                onClick={() => handleAddAsset(template.type)}
              >
                <span className="text-2xl">{template.icon}</span>
                <span className="text-xs">{template.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 资产列表 */}
      <div className="space-y-4 mb-6">
        {assets.map((asset, index) => (
          <Card key={asset.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('asset.title', { index: index + 1 })}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAsset(asset.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('asset.type')}</Label>
                  <Select
                    value={asset.type}
                    onValueChange={(value) => handleUpdateAsset(asset.id, 'type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="account">{t('asset.types.account')}</SelectItem>
                      <SelectItem value="wallet">{t('asset.types.wallet')}</SelectItem>
                      <SelectItem value="document">{t('asset.types.document')}</SelectItem>
                      <SelectItem value="message">{t('asset.types.message')}</SelectItem>
                      <SelectItem value="other">{t('asset.types.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('asset.platform')}</Label>
                  <Input
                    placeholder={t('asset.platform_placeholder')}
                    value={asset.platform || ''}
                    onChange={(e) => handleUpdateAsset(asset.id, 'platform', e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t('asset.username')}</Label>
                  <Input
                    placeholder={t('asset.username_placeholder')}
                    value={asset.username || ''}
                    onChange={(e) => handleUpdateAsset(asset.id, 'username', e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t('asset.password')}</Label>
                  <Input
                    type="password"
                    placeholder={t('asset.password_placeholder')}
                    value={asset.password || ''}
                    onChange={(e) => handleUpdateAsset(asset.id, 'password', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>{t('asset.notes')}</Label>
                <Textarea
                  placeholder={t('asset.notes_placeholder')}
                  value={asset.notes || ''}
                  onChange={(e) => handleUpdateAsset(asset.id, 'notes', e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {assets.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>{t('empty_state')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 最后的遗言 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('final_message.title')}</CardTitle>
          <CardDescription>{t('final_message.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={t('final_message.placeholder')}
            value={finalMessage}
            onChange={(e) => {
              setFinalMessage(e.target.value);
              setEncryptionStatus('ready');
            }}
            rows={6}
            className="font-sans"
          />
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          {t('actions.back')}
        </Button>
        <Button
          onClick={handleEncryptAndSave}
          disabled={encrypting || encryptionStatus === 'encrypting'}
          className="flex-1"
          size="lg"
        >
          {encrypting ? t('actions.encrypting') : t('actions.encrypt_and_continue')}
        </Button>
      </div>
    </div>
  );
}



