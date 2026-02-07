/**
 * Digital Heirloom Vault 页面
 * 资产管理页面
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/core/i18n/navigation';
import { Plus, Search, Filter, FileText, Video, Lock, File, ShieldCheck, ArrowRight, CheckCircle2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { AssetUploader, AssetCategory } from '@/shared/components/digital-heirloom/asset-uploader';
import AssetEntryForm from '@/shared/components/digital-heirloom/asset-entry-form';
import { TestHub } from '@/shared/components/digital-heirloom/test-hub';

interface VaultAsset {
  id: string;
  file_name: string;
  display_name: string;
  file_type: string;
  file_size: number;
  category: AssetCategory;
  created_at: string;
  version: number;
  isLocal?: boolean; // 标记是否为本地资产（IndexedDB）
  blobUrl?: string; // 本地资产的 Blob URL
  metadataSaved?: boolean; // 元数据是否已保存
}

export default function DigitalHeirloomVaultPage() {
  const router = useRouter();
  const t = useTranslations('digital-heirloom.vault');
  
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [useNewForm, setUseNewForm] = useState(true); // Toggle between old and new form
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'on_demand'>('free');
  const [hasVault, setHasVault] = useState<boolean | null>(null); // null = checking, true = exists, false = not exists

  useEffect(() => {
    loadVaultData();
    
    // 启动定期后台同步（每30秒检查一次）
    const syncInterval = setInterval(() => {
      if (vaultId) {
        startBackgroundSync(vaultId);
      }
    }, 30000); // 30秒
    
    return () => clearInterval(syncInterval);
  }, [vaultId]);

  const loadVaultData = async () => {
    try {
      // 1. 获取保险箱信息
      const vaultResponse = await fetch('/api/digital-heirloom/vault/get');
      const vaultResult = await vaultResponse.json();

      // 注意：respData 返回 code: 0（成功），不是 200
      // 如果没有 vault 数据，说明用户还没有创建保险箱
      if (vaultResult.code !== 0 || !vaultResult.data?.vault) {
        // 没有保险箱，显示引导界面
        setHasVault(false);
        setLoading(false);
        return;
      }

      const vault = vaultResult.data.vault;
      setVaultId(vault.id);
      setHasVault(true);

      // TODO: 获取用户套餐信息（从用户信息或保险箱配置）
      setUserPlan('pro'); // 临时值

      // 2. 获取资产列表（双轨制：API + IndexedDB）
      let cloudAssets: VaultAsset[] = [];
      try {
        const assetsResponse = await fetch('/api/digital-heirloom/assets/list');
        const assetsResult = await assetsResponse.json();

        // 注意：respData 返回 code: 0（成功），不是 200
        if (assetsResult.code === 0 && assetsResult.data?.assets) {
          cloudAssets = assetsResult.data.assets.map((asset: any) => ({
            id: asset.id,
            file_name: asset.file_name,
            display_name: asset.display_name,
            file_type: asset.file_type,
            file_size: asset.file_size,
            category: asset.category,
            created_at: asset.created_at,
            version: asset.version,
            isLocal: false,
          }));
        }
      } catch (assetsError) {
        console.warn('Failed to load assets list from API:', assetsError);
      }

      // 3. 从 IndexedDB 获取本地资产（本地优先）
      let localAssets: VaultAsset[] = [];
      try {
        const { getPendingAssets } = await import('@/shared/lib/indexeddb-cache');
        const pendingAssets = await getPendingAssets(vault.id);
        
        localAssets = pendingAssets.map((asset) => ({
          id: asset.id,
          file_name: asset.fileName,
          display_name: asset.displayName,
          file_type: asset.fileType,
          file_size: asset.fileSize,
          category: asset.category,
          created_at: new Date(asset.createdAt).toISOString(),
          version: 1,
          isLocal: true,
          blobUrl: asset.blobUrl,
          metadataSaved: asset.metadataSaved,
        }));
      } catch (indexedDBError) {
        console.warn('Failed to load assets from IndexedDB:', indexedDBError);
      }

      // 4. 合并资产列表（本地资产优先显示，去重）
      const cloudAssetIds = new Set(cloudAssets.map(a => a.id));
      const uniqueLocalAssets = localAssets.filter(a => !cloudAssetIds.has(a.id));
      const allAssets = [...cloudAssets, ...uniqueLocalAssets];
      
      setAssets(allAssets);

      // 5. 启动后台同步（如果有待同步的本地资产）
      if (uniqueLocalAssets.length > 0) {
        startBackgroundSync(vault.id);
      }
    } catch (error) {
      console.error('加载 Vault 数据失败:', error);
      toast.error('加载数据失败');
      setHasVault(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = async (assetId: string) => {
    toast.success('文件上传成功');
    setShowUploader(false);
    await loadVaultData();
  };

  // 后台同步机制：自动尝试同步 IndexedDB 中的待上传资产
  const startBackgroundSync = async (vaultId: string) => {
    try {
      const { getPendingAssets, updatePendingAsset, removePendingAsset } = await import('@/shared/lib/indexeddb-cache');
      const pendingAssets = await getPendingAssets(vaultId);
      
      for (const asset of pendingAssets) {
        // 只同步有 blobUrl 但元数据未保存的资产
        if (asset.blobUrl && !asset.metadataSaved) {
          try {
            const uploadResponse = await fetch('/api/digital-heirloom/assets/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                storage_path: asset.blobUrl,
                file_name: asset.fileName,
                display_name: asset.displayName,
                file_type: asset.fileType,
                file_size: asset.fileSize,
                encryption_salt: asset.salt,
                encryption_iv: asset.iv,
                checksum: asset.checksum,
                category: asset.category,
              }),
            });

            const uploadResult = await uploadResponse.json();
            if (uploadResult.code === 0) {
              // 同步成功，删除 IndexedDB 记录
              await removePendingAsset(asset.id);
              console.log('Asset synced successfully:', asset.fileName);
              // 刷新资产列表
              await loadVaultData();
            }
          } catch (syncError) {
            console.warn('Background sync failed for asset:', asset.fileName, syncError);
          }
        }
      }
    } catch (error) {
      console.warn('Background sync error:', error);
    }
  };

  // 下载 Recovery Kit PDF
  const handleDownloadRecoveryKit = async (asset: VaultAsset) => {
    try {
      // 获取 Vault 信息以生成 Recovery Kit
      const vaultResponse = await fetch('/api/digital-heirloom/vault/get');
      const vaultResult = await vaultResponse.json();
      
      if (vaultResult.code === 0 && vaultResult.data?.vault) {
        const vaultId = vaultResult.data.vault.id;
        
        // 从 IndexedDB 获取加密数据（如果是本地资产）
        if (asset.isLocal) {
          const { getPendingAssets } = await import('@/shared/lib/indexeddb-cache');
          const pendingAssets = await getPendingAssets(vaultId);
          const localAsset = pendingAssets.find(a => a.id === asset.id);
          
          if (localAsset) {
            // 生成 Recovery Kit（需要主密码，这里使用临时方案）
            // 注意：实际应用中，主密码应该由用户输入
            toast.info('Please enter your master password to generate Recovery Kit');
            return;
          }
        }
        
        // 对于云端资产，提示用户需要主密码
        toast.info('Recovery Kit generation requires your master password');
      }
    } catch (error) {
      console.error('Failed to download Recovery Kit:', error);
      toast.error('Failed to generate Recovery Kit');
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      asset.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: AssetCategory) => {
    switch (category) {
      case 'secure_keys':
        return <Lock className="w-5 h-5" />;
      case 'video_legacy':
        return <Video className="w-5 h-5" />;
      case 'legal_docs':
        return <FileText className="w-5 h-5" />;
      case 'instructions':
        return <File className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 如果没有保险箱，显示引导界面
  if (hasVault === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* 引导卡片 - Afterglow 暗金风格 */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* 顶部装饰条 */}
            <div className="h-2 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600"></div>
            
            <div className="p-8 md:p-12">
              {/* 图标和标题 */}
              <div className="text-center mb-8">
                <div className="inline-flex p-4 rounded-full bg-yellow-500/10 mb-6">
                  <Lock className="w-12 h-12 text-yellow-500" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  {t('setup_required.title')}
                </h1>
                <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
                  {t('setup_required.description')}
                </p>
              </div>

              {/* 设置步骤预览 */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {/* Step 1 */}
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold">
                      1
                    </div>
                    <h3 className="text-white font-semibold">{t('setup_required.step1_title')}</h3>
                  </div>
                  <p className="text-sm text-neutral-400">
                    {t('setup_required.step1_desc')}
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold">
                      2
                    </div>
                    <h3 className="text-white font-semibold">{t('setup_required.step2_title')}</h3>
                  </div>
                  <p className="text-sm text-neutral-400">
                    {t('setup_required.step2_desc')}
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold">
                      3
                    </div>
                    <h3 className="text-white font-semibold">{t('setup_required.step3_title')}</h3>
                  </div>
                  <p className="text-sm text-neutral-400">
                    {t('setup_required.step3_desc')}
                  </p>
                </div>
              </div>

              {/* ShipAny 物理同步说明 */}
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-6 mb-8">
                <div className="flex items-start gap-4">
                  <Package className="w-6 h-6 text-yellow-500 shrink-0 mt-1" />
                  <div>
                    <h3 className="text-yellow-500 font-bold mb-2">{t('setup_required.physical_sync_title')}</h3>
                    <p className="text-neutral-300 text-sm">
                      {t('setup_required.physical_sync_desc')}
                    </p>
                  </div>
                </div>
              </div>

              {/* 开始设置按钮 */}
              <div className="text-center">
                <button
                  onClick={() => router.push('/digital-heirloom/setup/step-1-master-password')}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all text-lg"
                >
                  <ShieldCheck className="w-5 h-5" />
                  {t('setup_required.start_setup')}
                  <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-xs text-neutral-500 mt-4">
                  {t('setup_required.security_note')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和操作栏 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('subtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowUploader(!showUploader)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>{t('add_asset')}</span>
          </button>
        </div>

        {/* 上传组件 - 使用新的 AssetEntryForm */}
        {showUploader && (
          <div className="mb-8 relative z-50">
            {useNewForm ? (
              <AssetEntryForm
                onComplete={async () => {
                  setShowUploader(false);
                  await loadVaultData();
                }}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Upload & Encrypt
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select a category to upload your asset
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {(['secure_keys', 'legal_docs', 'video_legacy', 'instructions'] as AssetCategory[]).map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        // TODO: 实现分类选择逻辑
                        setShowUploader(true);
                      }}
                      className="px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        {getCategoryIcon(category)}
                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {category === 'video_legacy' && userPlan === 'free' ? 'Pro only' : 'Click to upload'}
                      </p>
                    </button>
                  ))}
                </div>
                {vaultId && (
                  <AssetUploader
                    vaultId={vaultId}
                    category="secure_keys"
                    userPlan={userPlan}
                    onUploadComplete={handleUploadComplete}
                    onError={(error) => toast.error(error.message)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* 搜索和筛选栏 */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as AssetCategory | 'all')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="secure_keys">Secure Keys</option>
              <option value="legal_docs">Legal Docs</option>
              <option value="video_legacy">Video Legacy</option>
              <option value="instructions">Instructions</option>
            </select>
          </div>
        </div>

        {/* 资产列表 */}
        {filteredAssets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No assets yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start by adding your first encrypted asset to your vault.
            </p>
            <button
              onClick={() => {
                setShowUploader(true);
                // 确保 vaultId 已加载
                if (!vaultId) {
                  loadVaultData();
                }
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Add Your First Asset
            </button>
            
            {/* 如果上传器未显示，显示一个备用的直接入口 */}
            {!showUploader && (
              <div className="mt-6">
                <p className="text-sm text-gray-500 mb-3">Or use the upload button above</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${
                  asset.isLocal ? 'border-2 border-[#EAB308]' : ''
                }`}
              >
                {/* 本地资产标签 */}
                {asset.isLocal && (
                  <div className="mb-3 flex items-center gap-2">
                    <div className="px-2 py-1 bg-[#EAB308]/20 border border-[#EAB308]/50 rounded text-xs font-semibold text-[#EAB308] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      LOCAL SECURE
                    </div>
                    {!asset.metadataSaved && (
                      <div className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded text-xs text-yellow-500">
                        Syncing...
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      asset.isLocal 
                        ? 'bg-[#EAB308]/20' 
                        : 'bg-blue-50 dark:bg-blue-900/20'
                    }`}>
                      {getCategoryIcon(asset.category)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {asset.display_name}
                      </h3>
                      <p className="text-sm text-gray-500">{asset.file_name}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-medium">{formatFileSize(asset.file_size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Category:</span>
                    <span className="font-medium capitalize">{asset.category.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span className="font-medium">v{asset.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-medium">{new Date(asset.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {/* 物理证明下载按钮（金色高亮） */}
                  <button
                    onClick={() => handleDownloadRecoveryKit(asset)}
                    className="w-full px-4 py-2 bg-[#EAB308] hover:bg-[#D4AF37] text-black font-semibold rounded-lg transition-all shadow-[0_0_10px_rgba(234,179,8,0.3)] hover:shadow-[0_0_15px_rgba(234,179,8,0.5)] flex items-center justify-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    Download Recovery Kit
                  </button>
                  <div className="flex space-x-2">
                    <button className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors text-sm font-medium">
                      View
                    </button>
                    <button className="flex-1 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors text-sm font-medium">
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Test Hub - 测试工具（始终显示，用于测试） */}
        {vaultId && (
          <TestHub
            vaultId={vaultId}
            onTriggerInheritance={loadVaultData}
          />
        )}
      </div>
    </div>
  );
}

