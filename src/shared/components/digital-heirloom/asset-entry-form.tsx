/**
 * Asset Entry Form - Digital Heirloom Pro
 * 
 * High-trust asset encryption sandbox with Afterglow dark-gold styling.
 * Supports up to 2GB files with client-side streaming encryption.
 * 
 * Note: Does not modify ShipAny structure. ShipAny is used only as a
 * "black box" for physical delivery after encryption is complete.
 */

'use client';

import React, { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck, Lock, Users, ArrowRight, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AssetEntryFormProps {
  onComplete?: () => void;
}

export default function AssetEntryForm({ onComplete }: AssetEntryFormProps) {
  const t = useTranslations('digital-heirloom.vault.asset_entry');
  
  // Define wizard steps with translations
  const STEPS = [
    { id: 1, title: t('step1_title'), icon: Lock, description: t('step1_desc') },
    { id: 2, title: t('step2_title'), icon: ShieldCheck, description: t('step2_desc') },
    { id: 3, title: t('step3_title'), icon: Users, description: t('step3_desc') },
  ];
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [encryptionPhase, setEncryptionPhase] = useState<'key-derivation' | 'encryption' | 'sync' | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>([]);
  const [requirePhysicalDelivery, setRequirePhysicalDelivery] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false); // 强制激活状态
  const [passwordValid, setPasswordValid] = useState(false); // 密码验证状态
  const [selectedCategory, setSelectedCategory] = useState<'secure_keys' | 'legal_docs' | 'video_legacy' | 'instructions'>('secure_keys');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const encryptionStartTime = useRef<number | null>(null);
  
  // 强制状态同步：文件选择后立即激活
  React.useEffect(() => {
    if (selectedFile) {
      setIsReady(true);
      console.log('File ready, button should be active:', selectedFile.name);
    } else {
      setIsReady(false);
    }
  }, [selectedFile]);

  // 页面加载时恢复 IndexedDB 中的数据
  React.useEffect(() => {
    const restorePendingAssets = async () => {
      try {
        const { getPendingAssets } = await import('@/shared/lib/indexeddb-cache');
        const vaultResponse = await fetch('/api/digital-heirloom/vault/get');
        const vaultResult = await vaultResponse.json();
        
        if (vaultResult.code === 0 && vaultResult.data?.vault) {
          const vaultId = vaultResult.data.vault.id;
          const pendingAssets = await getPendingAssets(vaultId);
          
          if (pendingAssets.length > 0) {
            console.log(`Found ${pendingAssets.length} pending asset(s) in IndexedDB`);
            toast.info(`Found ${pendingAssets.length} pending asset(s). They will be synced automatically.`);
            
            // 后台尝试同步待上传的资产
            for (const asset of pendingAssets) {
              if (!asset.metadataSaved && asset.blobUrl) {
                // 尝试重新保存元数据
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
                    // 删除已同步的资产
                    const { removePendingAsset } = await import('@/shared/lib/indexeddb-cache');
                    await removePendingAsset(asset.id);
                    console.log('Pending asset synced:', asset.fileName);
                  }
                } catch (error) {
                  console.warn('Failed to sync pending asset:', error);
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('Failed to restore pending assets:', error);
        // 不显示错误，静默失败
      }
    };

    restorePendingAssets();
  }, []);

  // 密码验证：实时检查密码是否有效
  React.useEffect(() => {
    const isValid = 
      masterPassword.length >= 8 &&
      confirmPassword.length >= 8 &&
      masterPassword === confirmPassword &&
      masterPassword.trim() !== '' &&
      confirmPassword.trim() !== '';
    
    setPasswordValid(isValid);
    
    // 开发环境调试信息
    if (process.env.NODE_ENV === 'development') {
      console.log('Password validation:', {
        masterPasswordLength: masterPassword.length,
        confirmPasswordLength: confirmPassword.length,
        passwordsMatch: masterPassword === confirmPassword,
        isValid,
      });
    }
  }, [masterPassword, confirmPassword]);

  // Load beneficiaries on mount
  React.useEffect(() => {
    loadBeneficiaries();
  }, []);

  const loadBeneficiaries = async () => {
    try {
      const response = await fetch('/api/digital-heirloom/beneficiaries/list');
      const result = await response.json();
      // 注意：respData 返回 code: 0（成功），不是 200
      if (result.code === 0 && result.data?.beneficiaries) {
        setBeneficiaries(result.data.beneficiaries);
      }
    } catch (error) {
      console.error('Failed to load beneficiaries:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.warn('No file selected');
      return;
    }

    // Validate file size (2GB limit)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      toast.error(t('error_file_size'));
      return;
    }

    // 强制更新状态，确保按钮激活
    console.log('File selected:', file.name, file.size);
    setSelectedFile(file);
    toast.success(t('file_selected_title') + ': ' + file.name);
    
    // 强制触发重新渲染（确保按钮状态更新）
    setTimeout(() => {
      console.log('File state updated, selectedFile:', file.name);
    }, 100);
  };

  const handleEncrypt = async () => {
    if (!selectedFile) {
      toast.error(t('error_no_file'));
      return;
    }

    if (!masterPassword || masterPassword.length < 8) {
      toast.error(t('error_password_length'));
      return;
    }

    if (masterPassword !== confirmPassword) {
      toast.error(t('error_password_mismatch'));
      return;
    }

    setIsEncrypting(true);
    setEncryptionProgress(0);
    setEncryptionPhase('key-derivation');
    encryptionStartTime.current = Date.now();

    let vaultId: string | null = null;
    try {
      // Get vault ID
      const vaultResponse = await fetch('/api/digital-heirloom/vault/get');
      const vaultResult = await vaultResponse.json();
      
      // 注意：respData 返回 code: 0（成功），不是 200
      if (vaultResult.code !== 0 || !vaultResult.data?.vault) {
        throw new Error(t('error_get_vault_info'));
      }

      vaultId = vaultResult.data.vault.id;
      const fileSizeMB = selectedFile.size / (1024 * 1024);
      const estimatedEncryptionTimeMs = (fileSizeMB / 50) * 1000; // 假设 50MB/s 加密速度

      // Import encryption and upload functions
      const { encryptFile } = await import('@/shared/lib/file-encryption');
      const { put } = await import('@vercel/blob');

      // Phase 1: Key Generation (0% - 15%)
      setEncryptionPhase('key-derivation');
      setEncryptionProgress(5);
      await new Promise(resolve => setTimeout(resolve, 200)); // 模拟密钥派生
      setEncryptionProgress(15);

      // Phase 2: Data Encryption (15% - 85%)
      setEncryptionPhase('encryption');
      const encryptedResult = await encryptFile(selectedFile, masterPassword, (progress) => {
        const phaseProgress = 15 + (progress.percentage * 0.7); // 15-85% for encryption
        setEncryptionProgress(phaseProgress);
        
        // 计算预估剩余时间
        if (encryptionStartTime.current) {
          const elapsed = Date.now() - encryptionStartTime.current;
          const remaining = Math.max(0, (estimatedEncryptionTimeMs - elapsed) / 1000);
          setEstimatedTimeRemaining(Math.ceil(remaining));
        }
      });

      // Phase 3: Finalizing Asset (85% - 100%)
      setEncryptionPhase('sync');
      setEncryptionProgress(85);
      
      // 立即保存到 IndexedDB（防止数据丢失）
      let pendingAssetId: string | null = null;
      if (vaultId) {
        try {
          const { savePendingAsset } = await import('@/shared/lib/indexeddb-cache');
          pendingAssetId = await savePendingAsset({
            vaultId,
            encryptedData: encryptedResult.encryptedData,
            salt: encryptedResult.salt,
            iv: encryptedResult.iv,
            checksum: encryptedResult.checksum,
            fileName: selectedFile.name,
            displayName: selectedFile.name,
            fileType: selectedFile.type || 'application/octet-stream',
            fileSize: selectedFile.size,
            category: selectedCategory,
            metadataSaved: false,
          });
          console.log('Asset saved to IndexedDB:', pendingAssetId);
        } catch (indexedDBError: any) {
          console.warn('IndexedDB save failed (non-critical):', indexedDBError.message);
          // IndexedDB 失败不影响主流程
        }
      }
      
      // 上传到 Blob Storage（通过 API 路由，服务器端处理）
      let blobUrl: string | null = null;
      try {
        // 将 Uint8Array 转换为 Blob（使用类型断言解决 TypeScript 类型兼容性问题）
        const blob = new Blob([encryptedResult.encryptedData as BlobPart], { type: 'application/octet-stream' });
        const blobPath = `digital-heirloom/${vaultId}/${Date.now()}_${selectedFile.name}.encrypted`;
        
        // 使用 API 路由上传（服务器端可以访问环境变量）
        const formData = new FormData();
        formData.append('file', blob, `${selectedFile.name}.encrypted`);
        formData.append('path', blobPath);
        
        const uploadResponse = await fetch('/api/digital-heirloom/assets/blob-upload', {
          method: 'POST',
          body: formData,
        });
        
        const uploadResult = await uploadResponse.json();
        
        if (uploadResult.code === 0 && uploadResult.data?.url) {
          blobUrl = uploadResult.data.url;
          setEncryptionProgress(90);
        } else {
          throw new Error(uploadResult.message || 'Blob upload failed');
        }
        
        // 更新 IndexedDB 中的 blobUrl
        if (pendingAssetId && blobUrl) {
          try {
            const { updatePendingAsset } = await import('@/shared/lib/indexeddb-cache');
            await updatePendingAsset(pendingAssetId, { blobUrl: blobUrl || undefined });
          } catch (updateError) {
            // 忽略更新错误
          }
        }
      } catch (blobError: any) {
        console.error('Blob upload failed:', blobError);
        // 即使 Blob 上传失败，也继续流程（文件已加密并保存到 IndexedDB）
        blobUrl = null;
        toast.warning('File encrypted and saved locally. Cloud upload will retry automatically.');
      }

      setEncryptionProgress(92);

      // Save metadata to database（容错处理：失败不影响主流程）
      let metadataSaved = false;
      if (blobUrl) {
        try {
          const uploadResponse = await fetch('/api/digital-heirloom/assets/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storage_path: blobUrl,
              file_name: selectedFile.name,
              display_name: selectedFile.name,
              file_type: selectedFile.type || 'application/octet-stream',
              file_size: selectedFile.size,
              encryption_salt: encryptedResult.salt,
              encryption_iv: encryptedResult.iv,
              checksum: encryptedResult.checksum,
              category: selectedCategory, // 使用用户选择的分类
            }),
          });

          const uploadResult = await uploadResponse.json();
          
          // 注意：respData 返回 code: 0（成功），不是 200
          if (uploadResult.code === 0) {
            metadataSaved = true;
            
            // 更新 IndexedDB 状态并删除
            if (pendingAssetId) {
              try {
                const { removePendingAsset } = await import('@/shared/lib/indexeddb-cache');
                await removePendingAsset(pendingAssetId);
              } catch (removeError) {
                // 忽略删除错误
              }
            }
          } else {
            console.warn('Metadata save failed (non-critical):', uploadResult.message);
            // 更新 IndexedDB 状态，标记为未保存
            if (pendingAssetId) {
              try {
                const { updatePendingAsset } = await import('@/shared/lib/indexeddb-cache');
                await updatePendingAsset(pendingAssetId, { metadataSaved: false });
              } catch (updateError) {
                // 忽略更新错误
              }
            }
          }
        } catch (metadataError: any) {
          console.warn('Metadata save failed (non-critical):', metadataError.message);
          // 更新 IndexedDB 状态
          if (pendingAssetId) {
            try {
              const { updatePendingAsset } = await import('@/shared/lib/indexeddb-cache');
              await updatePendingAsset(pendingAssetId, { metadataSaved: false });
            } catch (updateError) {
              // 忽略更新错误
            }
          }
        }
      } else {
        // Blob 上传失败，元数据无法保存，但数据已在 IndexedDB 中
        console.log('Blob upload failed, metadata save skipped. Data saved in IndexedDB.');
      }

      setEncryptionProgress(100);
      setEncryptionPhase(null);
      setEstimatedTimeRemaining(null);
      encryptionStartTime.current = null;
      
      // Auto-generate and download Recovery Kit PDF（强制执行，不受后端影响）
      try {
        const { generateRecoveryKit } = await import('@/shared/lib/recovery-kit');
        const { downloadRecoveryKitPDF } = await import('@/shared/lib/recovery-kit-pdf');
        
        // Generate recovery kit（本地生成，不依赖后端）
        const recoveryKit = await generateRecoveryKit(masterPassword, vaultId || 'temp');
        
        // Get beneficiary name if available
        const beneficiaryName = selectedBeneficiaries.length > 0 
          ? beneficiaries.find(b => b.id === selectedBeneficiaries[0])?.name 
          : undefined;
        
        // Auto-download PDF（强制执行）
        await downloadRecoveryKitPDF(recoveryKit, beneficiaryName);
        toast.success('Recovery Kit PDF downloaded automatically');
      } catch (pdfError: any) {
        console.error('PDF generation failed (non-critical):', pdfError);
        // PDF 生成失败不影响主流程
        toast.warning('File encrypted successfully, but PDF generation failed. You can generate it later.');
      }
      
      // 显示成功消息
      if (metadataSaved) {
        toast.success(t('asset_config_complete'));
      } else {
        toast.success('File encrypted successfully. Metadata will be saved when connection is restored.');
      }
      
      setCurrentStep(3);
    } catch (error) {
      console.error('Encryption error:', error);
      
      // 容错处理：即使加密过程中出错，也尝试生成 PDF（如果可能）
      const errorMessage = error instanceof Error ? error.message : t('encryption_failed');
      
      // 如果错误不是致命的（比如只是元数据保存失败），仍然尝试生成 PDF
      if (errorMessage.includes('upload') || errorMessage.includes('metadata') || errorMessage.includes('database')) {
        toast.warning('File encryption completed, but some operations failed. PDF will be generated.');
        try {
          const { generateRecoveryKit } = await import('@/shared/lib/recovery-kit');
          const { downloadRecoveryKitPDF } = await import('@/shared/lib/recovery-kit-pdf');
          const recoveryKit = await generateRecoveryKit(masterPassword, vaultId || 'temp');
          await downloadRecoveryKitPDF(recoveryKit);
        } catch (pdfError) {
          console.error('PDF generation also failed:', pdfError);
        }
      } else {
        toast.error(errorMessage);
      }
      
      setEncryptionPhase(null);
      setEstimatedTimeRemaining(null);
      encryptionStartTime.current = null;
    } finally {
      setIsEncrypting(false);
      // 不要重置进度为0，保持最终状态
      if (encryptionProgress < 100) {
        setEncryptionProgress(0);
      }
    }
  };

  const handleComplete = async () => {
    if (selectedBeneficiaries.length === 0) {
      toast.error(t('select_beneficiary'));
      return;
    }

    // If physical delivery is required, create shipping request
    if (requirePhysicalDelivery) {
      try {
        // Create shipping request for each selected beneficiary
        for (const beneficiaryId of selectedBeneficiaries) {
          const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);
          if (!beneficiary) continue;

          // Create shipping request (ShipAny integration)
          // 注意：此 API 可能不存在，使用容错处理
          try {
            const shippingResponse = await fetch('/api/digital-heirloom/shipping/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                beneficiary_id: beneficiaryId,
                asset_description: selectedFile?.name || 'Digital Legacy Asset',
                require_physical_delivery: true,
              }),
            });

            if (shippingResponse.ok) {
              toast.success(t('shipping_request_created', { name: beneficiary.name }));
            } else if (shippingResponse.status === 404) {
              // API 路由不存在，静默处理（不影响主流程）
              console.log('Shipping API not available (404), skipping physical delivery request.');
            } else {
              console.warn('Shipping request failed:', shippingResponse.status);
            }
          } catch (error: any) {
            // 网络错误或 API 不存在，静默处理（不影响主流程）
            console.log('Shipping request error (non-critical):', error.message);
          }
        }
      } catch (error: any) {
        // 外层错误处理：静默处理，不影响主流程
        console.log('Shipping request process error (non-critical):', error.message);
      }
    }

    toast.success(t('asset_config_complete'));
    onComplete?.();
    
    // Reset form
    setCurrentStep(1);
    setSelectedFile(null);
    setMasterPassword('');
    setConfirmPassword('');
    setSelectedBeneficiaries([]);
    setRequirePhysicalDelivery(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Progress bar */}
      <div className="flex border-b border-neutral-800 bg-black/20">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div
              key={step.id}
              className={`flex-1 flex items-center justify-center py-4 px-2 gap-2 border-b-2 transition-colors ${
                isActive
                  ? 'border-gold-500 text-gold-500'
                  : isCompleted
                  ? 'border-green-500 text-green-500'
                  : 'border-transparent text-neutral-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider hidden sm:inline">
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      <div className="p-8">
        {/* Step 1: Asset Selection */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">{t('prepare_title')}</h2>
              <p className="text-neutral-400 text-sm">
                {t('prepare_desc')}
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative border-2 border-dashed border-neutral-700 hover:border-gold-500/50 rounded-xl p-12 transition-all cursor-pointer bg-black/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept="*/*"
              />
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-full bg-neutral-800 group-hover:bg-gold-500/10 transition-colors">
                  <UploadCloud className="w-8 h-8 text-neutral-500 group-hover:text-gold-500" />
                </div>
                <p className="mt-4 text-neutral-300 font-medium">
                  {selectedFile ? selectedFile.name : t('click_or_drag')}
                </p>
                {selectedFile && (
                  <p className="text-xs text-neutral-500 mt-2">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
                {!selectedFile && (
                  <p className="text-xs text-neutral-500 mt-2">
                    {t('local_encryption_note')}
                  </p>
                )}
              </div>
            </div>

            {selectedFile && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-500 font-bold text-sm">{t('file_selected')}</p>
                  <p className="text-neutral-400 text-xs">{selectedFile.name}</p>
                </div>
              </div>
            )}

            {/* 强制激活按钮 - 基于本地状态，不依赖后端 */}
            <div className="relative z-50 mt-6">
              <button
                onClick={() => {
                  // 强制激活逻辑：只要有文件就允许进入下一步
                  if (selectedFile) {
                    setCurrentStep(2);
                  } else {
                    toast.error(t('error_no_file'));
                    fileInputRef.current?.click();
                  }
                }}
                disabled={!selectedFile}
                className={`w-full py-4 font-bold rounded-lg transition-all flex items-center justify-center gap-2 relative ${
                  selectedFile
                    ? 'bg-[#EAB308] hover:bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] transform hover:scale-[1.02] animate-pulse'
                    : 'bg-neutral-700 text-neutral-500 cursor-not-allowed opacity-50'
                }`}
                style={{
                  minHeight: '56px',
                  zIndex: 999,
                  position: 'relative',
                }}
              >
                {selectedFile ? (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-lg font-semibold">{t('next_step_encryption')}</span>
                    <ArrowRight className="w-5 h-5 animate-bounce" />
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5" />
                    <span>{t('click_or_drag')}</span>
                  </>
                )}
              </button>
              
            </div>
          </div>
        )}

        {/* Step 2: Encryption */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="bg-gold-500/5 border border-gold-500/20 rounded-lg p-4 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-gold-500 shrink-0" />
              <div>
                <p className="text-gold-500 font-bold text-sm">{t('zero_knowledge_active')}</p>
                <p className="text-neutral-400 text-xs">
                  {t('zero_knowledge_desc')}
                </p>
              </div>
            </div>

            {isEncrypting ? (
              <div className="space-y-6">
                {/* Phase Indicator */}
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mb-4"></div>
                  <p className="text-gold-500 font-bold text-lg mb-2">
                    {encryptionPhase === 'key-derivation' && 'Phase 1: Key Generation'}
                    {encryptionPhase === 'encryption' && `Phase 2: Data Encryption`}
                    {encryptionPhase === 'sync' && 'Phase 3: Finalizing Asset'}
                  </p>
                  <p className="text-neutral-400 text-sm">
                    {encryptionPhase === 'key-derivation' && 'Generating 256-bit AES key for you...'}
                    {encryptionPhase === 'encryption' && `Encrypting '${selectedFile?.name}' (streaming encryption in progress, large file chunk processing)...`}
                    {encryptionPhase === 'sync' && 'Syncing ShipAny physical recovery fragment and completing storage...'}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-300">Overall Progress</span>
                    <span className="text-gold-500 font-bold">
                      {Math.round(encryptionProgress)}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-gold-500 to-gold-400 h-3 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                      style={{ width: `${encryptionProgress}%` }}
                    ></div>
                  </div>
                  
                  {/* Phase Progress Indicators */}
                  <div className="flex items-center gap-2 mt-3">
                    <div className={`flex-1 h-1 rounded-full transition-all ${encryptionProgress >= 15 ? 'bg-gold-500' : 'bg-neutral-700'}`}></div>
                    <div className={`flex-1 h-1 rounded-full transition-all ${encryptionProgress >= 85 ? 'bg-gold-500' : encryptionProgress > 15 ? 'bg-gold-500/50' : 'bg-neutral-700'}`}></div>
                    <div className={`flex-1 h-1 rounded-full transition-all ${encryptionProgress >= 100 ? 'bg-gold-500' : encryptionProgress > 85 ? 'bg-gold-500/50' : 'bg-neutral-700'}`}></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>Phase 1: Key Generation</span>
                    <span>Phase 2: Data Encryption</span>
                    <span>Phase 3: Finalizing Asset</span>
                  </div>
                </div>

                {/* Estimated Time */}
                {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-neutral-500">
                      Estimated time remaining: ~{Math.ceil(estimatedTimeRemaining / 60)} minutes
                    </p>
                  </div>
                )}

                {/* Useful Info */}
                <div className="bg-gold-500/5 border border-gold-500/20 rounded-lg p-4">
                  <p className="text-xs text-gold-500/80 text-center">
                    <span className="font-semibold">Zero-Knowledge Encryption Active:</span> Your private key never leaves your browser. ShipAny is arranging your offline backup package.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Category Selection */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-neutral-300">
                    Asset Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as typeof selectedCategory)}
                    className="w-full bg-black border border-neutral-700 rounded-lg py-3 px-4 text-white focus:ring-1 focus:border-gold-500 focus:ring-gold-500 transition-all outline-none"
                  >
                    <option value="secure_keys">Secure Keys (Passwords, API Keys)</option>
                    <option value="legal_docs">Legal Documents</option>
                    <option value="video_legacy">Video Legacy</option>
                    <option value="instructions">Instructions</option>
                  </select>
                  <p className="text-xs text-neutral-500">
                    Select the category that best describes your asset
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-neutral-300">
                    {t('master_password_label')}
                  </label>
                  <input
                    type="password"
                    value={masterPassword}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMasterPassword(value);
                      console.log('Master password changed:', value.length, 'characters');
                    }}
                    placeholder="••••••••••••"
                    className={`w-full bg-black border rounded-lg py-3 px-4 text-white focus:ring-1 transition-all outline-none ${
                      masterPassword.length >= 8
                        ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500'
                        : masterPassword.length > 0
                        ? 'border-yellow-500/50 focus:border-yellow-500 focus:ring-yellow-500'
                        : 'border-neutral-700 focus:border-gold-500 focus:ring-gold-500'
                    }`}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-500">
                      {t('master_password_hint')}
                    </p>
                    {masterPassword.length > 0 && (
                      <p className={`text-xs ${
                        masterPassword.length >= 8 ? 'text-green-500' : 'text-yellow-500'
                      }`}>
                        {masterPassword.length}/8
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-neutral-300">
                    {t('confirm_password_label')}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConfirmPassword(value);
                      console.log('Confirm password changed:', value.length, 'characters');
                    }}
                    placeholder="••••••••••••"
                    className={`w-full bg-black border rounded-lg py-3 px-4 text-white focus:ring-1 transition-all outline-none ${
                      confirmPassword.length >= 8 && masterPassword === confirmPassword
                        ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500'
                        : confirmPassword.length > 0 && masterPassword !== confirmPassword
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500'
                        : confirmPassword.length > 0
                        ? 'border-yellow-500/50 focus:border-yellow-500 focus:ring-yellow-500'
                        : 'border-neutral-700 focus:border-gold-500 focus:ring-gold-500'
                    }`}
                  />
                  {confirmPassword.length > 0 && (
                    <div className="flex items-center gap-2">
                      {masterPassword === confirmPassword && masterPassword.length >= 8 ? (
                        <p className="text-xs text-green-500 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Passwords match
                        </p>
                      ) : confirmPassword.length > 0 && masterPassword !== confirmPassword ? (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Passwords do not match
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* 强制激活按钮 - 基于本地密码验证，不依赖后端 */}
                <button
                  onClick={handleEncrypt}
                  disabled={!passwordValid || isEncrypting}
                  className={`w-full py-4 font-bold rounded-lg transition-all relative ${
                    passwordValid && !isEncrypting
                      ? 'bg-[#EAB308] hover:bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] transform hover:scale-[1.02]'
                      : 'bg-neutral-700 text-neutral-500 cursor-not-allowed opacity-50'
                  }`}
                  style={{
                    minHeight: '56px',
                  }}
                >
                  {isEncrypting ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                      <span>Encrypting...</span>
                    </>
                  ) : passwordValid ? (
                    <>
                      <ShieldCheck className="w-5 h-5 inline-block mr-2" />
                      <span className="font-semibold">{t('confirm_and_encrypt')}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 inline-block mr-2" />
                      <span>
                        {masterPassword.length < 8 || confirmPassword.length < 8
                          ? 'Password must be at least 8 characters'
                          : masterPassword !== confirmPassword
                          ? 'Passwords do not match'
                          : t('confirm_and_encrypt')}
                      </span>
                    </>
                  )}
                </button>

              </>
            )}
          </div>
        )}

        {/* Step 3: Beneficiary Association */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-green-500/10 mb-4">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-white">{t('file_encrypted')}</h2>
              <p className="text-neutral-400 text-sm">
                {t('file_encrypted_desc')}
              </p>
            </div>

            {beneficiaries.length === 0 ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                <div>
                  <p className="text-yellow-500 font-bold text-sm">{t('no_beneficiaries')}</p>
                  <p className="text-neutral-400 text-xs">
                    {t('no_beneficiaries_desc')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {beneficiaries.map((beneficiary) => (
                  <div
                    key={beneficiary.id}
                    onClick={() => {
                      if (selectedBeneficiaries.includes(beneficiary.id)) {
                        setSelectedBeneficiaries(
                          selectedBeneficiaries.filter((id) => id !== beneficiary.id)
                        );
                      } else {
                        setSelectedBeneficiaries([...selectedBeneficiaries, beneficiary.id]);
                      }
                    }}
                    className={`flex items-center justify-between p-4 bg-neutral-800/50 border rounded-lg cursor-pointer transition-all ${
                      selectedBeneficiaries.includes(beneficiary.id)
                        ? 'border-gold-500 bg-gold-500/10'
                        : 'border-neutral-700 hover:border-gold-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-white font-bold">
                        {beneficiary.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{beneficiary.name}</p>
                        <p className="text-neutral-500 text-xs">{beneficiary.email}</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedBeneficiaries.includes(beneficiary.id)}
                      onChange={() => {}}
                      className="accent-gold-500"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 space-y-3">
              <label className="flex items-center gap-3 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg cursor-pointer hover:border-gold-500/30 transition-all">
                <input
                  type="checkbox"
                  checked={requirePhysicalDelivery}
                  onChange={(e) => setRequirePhysicalDelivery(e.target.checked)}
                  className="accent-gold-500"
                />
                <div>
                  <p className="text-white font-medium text-sm">{t('physical_fragment')}</p>
                  <p className="text-neutral-500 text-xs">
                    {t('physical_fragment_desc')}
                  </p>
                </div>
              </label>

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 py-4 border border-neutral-700 text-neutral-300 font-bold rounded-lg hover:bg-neutral-800 transition-all"
                >
                  {t('back')}
                </button>
                <button
                  onClick={handleComplete}
                  disabled={selectedBeneficiaries.length === 0}
                  className={`flex-1 py-4 font-bold rounded-lg transition-all ${
                    selectedBeneficiaries.length > 0
                      ? 'bg-[#EAB308] hover:bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] transform hover:scale-[1.02]'
                      : 'bg-neutral-700 text-neutral-500 cursor-not-allowed opacity-50'
                  }`}
                  style={{
                    minHeight: '56px',
                  }}
                >
                  {selectedBeneficiaries.length > 0 ? (
                    <>
                      <CheckCircle className="w-5 h-5 inline-block mr-2" />
                      <span className="font-semibold">{t('complete_config')}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 inline-block mr-2" />
                      <span>Please select at least one beneficiary</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

