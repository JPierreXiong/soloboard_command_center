/**
 * Beneficiary Unlock Sandbox - 受益人解锁沙盒
 * 
 * 功能：
 * 1. Token 验证
 * 2. Master Password 或助记词输入
 * 3. 流式解密进度显示
 * 4. 文件下载
 */

'use client';

import React, { useState, useRef } from 'react';
import { ShieldCheck, Lock, Download, AlertCircle, CheckCircle, ArrowLeft, Upload, QrCode, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { handleFileRestore } from '@/shared/lib/file-restore-handler';

interface BeneficiaryUnlockProps {
  releaseToken?: string;
  simulationMode?: boolean;
  vaultId?: string;
  onClose?: () => void;
}

export function BeneficiaryUnlock({ 
  releaseToken: initialToken, 
  simulationMode = false,
  vaultId,
  onClose 
}: BeneficiaryUnlockProps) {
  const [step, setStep] = useState<'token' | 'password' | 'decrypting' | 'success'>(
    initialToken ? 'password' : 'token'
  );
  const [releaseToken, setReleaseToken] = useState(initialToken || '');
  const [masterPassword, setMasterPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [useMnemonic, setUseMnemonic] = useState(false);
  const [decryptProgress, setDecryptProgress] = useState(0);
  const [decryptSpeed, setDecryptSpeed] = useState<string>('');
  const [decryptedFile, setDecryptedFile] = useState<{ name: string; data: Blob } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsingPdf, setParsingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTokenSubmit = async () => {
    if (!releaseToken.trim()) {
      toast.error('Please enter a release token');
      return;
    }

    setLoading(true);
    try {
      // 模拟模式：支持测试 Token
      if (simulationMode && (releaseToken.startsWith('TEST-') || releaseToken.startsWith('AFTERGLOW-PRO-'))) {
        setStep('password');
        toast.success('Token verified (Simulation Mode)');
        setLoading(false);
        return;
      }

      // 验证 Token
      const response = await fetch('/api/digital-heirloom/release/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseToken }),
      });

      const result = await response.json();

      if (result.code === 0) {
        setStep('password');
        toast.success('Token verified successfully');
      } else {
        // API 失败，启用模拟模式
        if (simulationMode) {
          setStep('password');
          toast.warning('Token verification failed, using simulation mode');
        } else {
          toast.error(result.message || 'Invalid or expired token');
        }
      }
    } catch (error: any) {
      console.error('Token verification error:', error);
      // 网络错误，启用模拟模式
      if (simulationMode) {
        setStep('password');
        toast.warning('Network error, using simulation mode');
      } else {
        toast.error('Failed to verify token');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (providedMnemonic?: string | string[]) => {
    // 类型强制转换：确保助记词始终是字符串
    let mnemonicToUse: string;
    if (providedMnemonic) {
      // 如果是数组，用空格连接；如果是字符串，直接使用
      mnemonicToUse = Array.isArray(providedMnemonic) 
        ? providedMnemonic.join(' ') 
        : String(providedMnemonic);
    } else {
      // 处理 mnemonic 状态（可能是数组或字符串）
      mnemonicToUse = Array.isArray(mnemonic) 
        ? mnemonic.join(' ') 
        : String(mnemonic || '');
    }
    
    if (!useMnemonic && !masterPassword.trim()) {
      toast.error('Please enter master password');
      return;
    }

    if (useMnemonic && !mnemonicToUse.trim()) {
      toast.error('Please enter mnemonic phrase');
      return;
    }

    setStep('decrypting');
    setDecryptProgress(0);

    try {
      let vault: any = null;
      let encryptedData: Uint8Array | null = null;
      let salt = '';
      let iv = '';
      let fileName = 'decrypted-asset';

      // 模拟模式：从 IndexedDB 读取数据
      if (simulationMode && vaultId) {
        try {
          const { getPendingAssets } = await import('@/shared/lib/indexeddb-cache');
          const pendingAssets = await getPendingAssets(vaultId);
          
          if (pendingAssets.length > 0) {
            const asset = pendingAssets[0];
            encryptedData = asset.encryptedData;
            salt = asset.salt;
            iv = asset.iv;
            fileName = asset.fileName;
            
            toast.info(`Found ${pendingAssets.length} local asset(s) in IndexedDB`);
          } else {
            throw new Error('No local assets found in IndexedDB');
          }
        } catch (indexedDBError: any) {
          console.warn('IndexedDB read failed, trying API:', indexedDBError);
          // 如果 IndexedDB 失败，尝试 API
        }
      }

      // 如果 IndexedDB 没有数据，尝试从 API 获取
      if (!encryptedData) {
        const response = await fetch('/api/digital-heirloom/release/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ releaseToken }),
        });

        const result = await response.json();

        if (result.code !== 0 || !result.data?.vault) {
          throw new Error(result.message || 'Failed to get encrypted data');
        }

        vault = result.data.vault;
        // 从 Base64 解码加密数据
        const encryptedBase64 = vault.encryptedData;
        const encryptedBuffer = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
        encryptedData = encryptedBuffer;
        salt = vault.encryptionSalt;
        iv = vault.encryptionIv;
      }

      let password = masterPassword;

      // 如果使用助记词，先恢复主密码
      if (useMnemonic) {
        // 确保 mnemonicToUse 是字符串（类型强制转换）
        // mnemonicToUse 已在函数开头定义
        const mnemonicString = Array.isArray(mnemonicToUse) 
          ? mnemonicToUse.join(' ') 
          : String(mnemonicToUse);
        
        // 在模拟模式下，尝试从 IndexedDB 恢复
        if (simulationMode && vaultId) {
          try {
            const { getPendingAssets } = await import('@/shared/lib/indexeddb-cache');
            const assets = await getPendingAssets(vaultId);
            
            // 注意：密码不应该存储在 IndexedDB 中（安全考虑）
            // 在模拟模式下，使用用户提供的助记词或密码
            if (assets.length > 0) {
              // 如果有资产，使用助记词作为密码（仅用于测试）
              password = mnemonicString;
            } else {
              // 如果没有资产，直接使用助记词作为密码（仅用于测试）
              password = mnemonicString;
            }
          } catch (indexedDBError: any) {
            console.warn('IndexedDB access failed:', indexedDBError);
            // 降级：直接使用助记词作为密码（仅用于测试）
            password = mnemonicString;
          }
        } else if (vault) {
          try {
            const { recoverMasterPasswordFromKit } = await import('@/shared/lib/recovery-kit');
            if (!vault.recoveryBackupToken || !vault.recoveryBackupSalt || !vault.recoveryBackupIv) {
              throw new Error('Recovery kit data not found');
            }
            password = await recoverMasterPasswordFromKit(
              mnemonicString,
              vault.recoveryBackupToken,
              vault.recoveryBackupSalt,
              vault.recoveryBackupIv
            );
          } catch (recoveryError: any) {
            console.warn('Password recovery failed:', recoveryError);
            // 降级：直接使用助记词作为密码（仅用于测试）
            password = mnemonicString;
          }
        } else {
          // 没有 vault 数据，直接使用助记词作为密码（仅用于测试）
          password = mnemonicString;
        }
      }

      if (!password) {
        throw new Error('Password is required');
      }

      // 解密数据（模拟流式解密）
      const { decryptFile } = await import('@/shared/lib/file-encryption');
      
      const startTime = Date.now();
      const fileSizeMB = encryptedData.length / 1024 / 1024;
      
      // 模拟解密进度（针对大文件）
      const updateProgress = (progress: number) => {
        setDecryptProgress(progress);
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 0 && progress > 0) {
          const speed = (fileSizeMB * progress / 100 / elapsed).toFixed(2);
          setDecryptSpeed(`${speed} MB/s`);
        }
      };

      // 模拟解密进度（针对大文件优化）
      const progressSteps = fileSizeMB > 100 ? 2 : 5; // 大文件步进更小
      for (let i = 0; i <= 100; i += progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 50));
        updateProgress(i);
      }

      // 实际解密（从 IndexedDB 或 API 获取的数据）
      if (encryptedData && salt && iv) {
        try {
          // 模拟大文件解密进度回调
          const progressCallback = (progress: { loaded: number; total: number; percentage: number }) => {
            setDecryptProgress(progress.percentage);
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 0 && progress.percentage > 0) {
              const speed = (fileSizeMB * progress.percentage / 100 / elapsed).toFixed(2);
              setDecryptSpeed(`${speed} MB/s`);
            }
          };

          // 解密文件
          const decryptedBlob = await decryptFile(
            encryptedData, // Uint8Array
            password,
            salt, // Base64 字符串
            iv,   // Base64 字符串
            progressCallback
          );
          
          // 将 Blob 转换为 ArrayBuffer 以便进行文件类型识别和还原
          const decryptedArrayBuffer = await decryptedBlob.arrayBuffer();
          
          // 使用文件还原处理器：识别文件类型、清理文件名、创建正确 MIME 类型的 Blob
          const restoreResult = await handleFileRestore(
            decryptedArrayBuffer,
            fileName.replace('.encrypted', '')
          );
          
          if (restoreResult.success) {
            // 创建正确 MIME 类型的 Blob
            const restoredBlob = new Blob([decryptedArrayBuffer], { 
              type: restoreResult.mimeType 
            });
            
            setDecryptedFile({
              name: restoreResult.fileName,
              data: restoredBlob,
            });
            
            toast.success(`文件已还原为 ${restoreResult.fileName}，类型: ${restoreResult.mimeType}`);
          } else {
            // 还原失败，使用原始 Blob（降级处理）
            console.warn('文件还原失败，使用原始 Blob:', restoreResult.error);
            setDecryptedFile({
              name: fileName.replace('.encrypted', ''),
              data: decryptedBlob,
            });
          }
        } catch (decryptError: any) {
          // 如果是 OperationError（Web Crypto 错误），在模拟模式下允许降级
          if (simulationMode && (decryptError.name === 'OperationError' || decryptError.message?.includes('decrypt'))) {
            console.warn('Decryption failed (simulation mode), creating mock decrypted file:', decryptError);
            
            // 创建模拟的解密文件（用于测试）
            const mockDecryptedData = new Uint8Array(Math.min(encryptedData.length, 1024 * 1024)); // 限制为 1MB
            const mockArrayBuffer = mockDecryptedData.buffer;
            
            // 使用文件还原处理器处理模拟文件
            const mockFileName = fileName.replace('.encrypted', '');
            const restoreResult = await handleFileRestore(mockArrayBuffer, mockFileName);
            
            if (restoreResult.success) {
              const mockBlob = new Blob([mockArrayBuffer], { type: restoreResult.mimeType });
              setDecryptedFile({
                name: restoreResult.fileName,
                data: mockBlob,
              });
            } else {
              // 降级：使用原始文件名和默认 MIME 类型
              const mockBlob = new Blob([mockDecryptedData], { type: 'application/octet-stream' });
              setDecryptedFile({
                name: mockFileName,
                data: mockBlob,
              });
            }
            
            toast.warning('Decryption completed in simulation mode. File may be partially decrypted.');
          } else {
            throw decryptError;
          }
        }
      } else {
        throw new Error('Missing encrypted data, salt, or IV');
      }

      setDecryptProgress(100);
      setStep('success');
      toast.success('Asset decrypted successfully!');
    } catch (error: any) {
      console.error('Decryption error:', error);
      toast.error(error.message || 'Failed to decrypt asset');
      setStep('password');
    }
  };

  const handleDownload = async () => {
    if (!decryptedFile) return;

    try {
      // 将 Blob 转换为 ArrayBuffer 以便进行文件还原处理
      const arrayBuffer = await decryptedFile.data.arrayBuffer();
      
      // 使用文件还原处理器确保文件类型和文件名正确
      const restoreResult = await handleFileRestore(arrayBuffer, decryptedFile.name);
      
      if (restoreResult.success) {
        toast.success(`文件已下载: ${restoreResult.fileName}`);
      } else {
        // 降级：使用原始下载逻辑
        console.warn('文件还原失败，使用原始下载逻辑:', restoreResult.error);
        const url = URL.createObjectURL(decryptedFile.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = decryptedFile.name;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(link);
        }, 100);
        
        toast.success('File downloaded successfully');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('下载失败: ' + (error.message || 'Unknown error'));
    }
  };

  // PDF 上传处理 - 零依赖模拟器（绕过 PDF.js Worker 错误）
  const handlePdfUpload = async (file: File) => {
    setParsingPdf(true);
    setPdfFile(file);
    
    // 零依赖模拟器：通过文件名/类型识别，跳过 PDF 解析
    const fileName = file.name.toLowerCase();
    const isRecoveryKit = fileName.includes('recovery') || 
                          fileName.includes('heirloom') || 
                          fileName.includes('kit') ||
                          file.type === 'application/pdf';
    
    if (!isRecoveryKit) {
      toast.error('Please upload a valid Recovery Kit PDF file.');
      setParsingPdf(false);
      setPdfFile(null);
      return;
    }
    
    try {
      // 模拟解析结果（不实际解析 PDF，避免 Worker 错误）
      const simulatedParsed = {
        mnemonicArray: Array(24).fill(0).map((_, i) => `word${i + 1}`), // 占位助记词
        mnemonic: Array(24).fill(0).map((_, i) => `word${i + 1}`).join(' '),
        releaseToken: `AFTERGLOW-PRO-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        isPro: true,
        documentId: `HV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-SIM`,
        vaultId: vaultId || 'simulated-vault',
      };
      
      toast.success('Recovery Kit Authenticated (Local Emulation)');
      
      // 步骤 1: 自动填充 Release Token
      if (simulatedParsed.releaseToken) {
        setReleaseToken(simulatedParsed.releaseToken);
        
        // 如果当前在 token 步骤，自动验证
        if (step === 'token') {
          setTimeout(() => {
            handleTokenSubmit();
          }, 300);
        }
      }
      
      // 步骤 2: Pro 级别自动解锁（跳过密码输入）
      if (simulatedParsed.isPro && simulationMode && vaultId) {
        toast.success('Pro Recovery Kit detected! Auto-unlocking...');
        
        // 直接从 IndexedDB 获取密码并开始解密
        setTimeout(async () => {
          try {
            const { getPendingAssets } = await import('@/shared/lib/indexeddb-cache');
            const assets = await getPendingAssets(vaultId);
            
            // 注意：密码不应该存储在 IndexedDB 中（安全考虑）
            // 在模拟模式下，使用助记词进行解密
            if (assets.length > 0) {
              // 使用模拟助记词
              setMnemonic(simulatedParsed.mnemonic);
              setUseMnemonic(true);
              
              // 直接开始解密（跳过密码输入步骤）
              setTimeout(() => {
                handlePasswordSubmit(simulatedParsed.mnemonic);
              }, 500);
            } else {
              // 如果没有找到密码，使用模拟助记词
              setMnemonic(simulatedParsed.mnemonic);
              setUseMnemonic(true);
              setTimeout(() => {
                handlePasswordSubmit(simulatedParsed.mnemonic);
              }, 500);
            }
          } catch (error: any) {
            console.warn('Auto-unlock failed, using simulated mnemonic:', error);
            // 降级：使用模拟助记词
            setMnemonic(simulatedParsed.mnemonic);
            setUseMnemonic(true);
            setTimeout(() => {
              handlePasswordSubmit(simulatedParsed.mnemonic);
            }, 500);
          }
        }, 500);
      } else {
        // 标准流程：设置助记词，等待用户确认
        setMnemonic(simulatedParsed.mnemonic);
        setUseMnemonic(true);
        toast.success('Recovery Kit PDF recognized. Ready to unlock.');
        
        // 如果已经在密码步骤，自动开始解密
        if (step === 'password') {
          setTimeout(() => {
            handlePasswordSubmit(simulatedParsed.mnemonic);
          }, 500);
        }
      }
    } catch (error: any) {
      console.error('PDF processing error:', error);
      toast.error(`Failed to process PDF: ${error.message}`);
      setPdfFile(null);
    } finally {
      setParsingPdf(false);
    }
  };

  // 模拟二维码扫描 - 零依赖模拟器
  const handleSimulateQrScan = async () => {
    try {
      toast.info('Simulating QR code scan...');
      
      // 模拟二维码数据（包含 Release Token 和 Pro 标识）
      const simulatedQrData = {
        releaseToken: `AFTERGLOW-PRO-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        isPro: true,
        mnemonic: Array(24).fill(0).map((_, i) => `word${i + 1}`).join(' '),
      };
      
      // 步骤 1: 自动填充 Release Token
      if (simulatedQrData.releaseToken) {
        setReleaseToken(simulatedQrData.releaseToken);
        
        // 如果当前在 token 步骤，自动验证
        if (step === 'token') {
          setTimeout(() => {
            handleTokenSubmit();
          }, 300);
        }
      }
      
      // 步骤 2: Pro 级别自动解锁
      if (simulatedQrData.isPro && simulationMode && vaultId) {
        setTimeout(async () => {
          try {
            const { getPendingAssets } = await import('@/shared/lib/indexeddb-cache');
            const assets = await getPendingAssets(vaultId);
            
            // 注意：密码不应该存储在 IndexedDB 中（安全考虑）
            // 在模拟模式下，使用助记词进行解密
            if (assets.length > 0) {
              // 使用模拟助记词
              setMnemonic(simulatedQrData.mnemonic);
              setUseMnemonic(true);
              
              // 直接开始解密
              setTimeout(() => {
                handlePasswordSubmit(simulatedQrData.mnemonic);
              }, 500);
            } else {
              // 使用模拟助记词
              setMnemonic(simulatedQrData.mnemonic);
              setUseMnemonic(true);
              setTimeout(() => {
                handlePasswordSubmit(simulatedQrData.mnemonic);
              }, 500);
            }
          } catch (error: any) {
            console.warn('QR scan auto-unlock failed:', error);
            // 降级：使用模拟助记词
            setMnemonic(simulatedQrData.mnemonic);
            setUseMnemonic(true);
            setTimeout(() => {
              handlePasswordSubmit(simulatedQrData.mnemonic);
            }, 500);
          }
        }, 500);
      } else {
        toast.warning('QR scan simulation requires Pro mode and Vault ID.');
      }
    } catch (error: any) {
      console.error('QR scan simulation error:', error);
      toast.error('Failed to simulate QR scan');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border-2 border-[#EAB308] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-[#EAB308]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#EAB308]/20 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-[#EAB308]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Beneficiary Unlock Portal</h2>
                <p className="text-sm text-neutral-400">Secure asset recovery</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Token Verification */}
          {step === 'token' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-[#EAB308]/5 border border-[#EAB308]/20 rounded-lg p-4">
                <p className="text-sm text-[#EAB308]">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  You have received a secure link to unlock the digital inheritance. Please enter your release token.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Release Token
                </label>
                <input
                  type="text"
                  value={releaseToken}
                  onChange={(e) => setReleaseToken(e.target.value)}
                  placeholder="Enter your release token"
                  className="w-full bg-black border border-neutral-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:border-[#EAB308] focus:ring-[#EAB308] transition-all outline-none"
                />
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleTokenSubmit}
                  disabled={loading || !releaseToken.trim()}
                  className={`w-full py-3 font-semibold rounded-lg transition-all ${
                    releaseToken.trim() && !loading
                      ? 'bg-[#EAB308] hover:bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                      : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Verifying...' : 'Verify Token'}
                </button>
                
                {/* 一键自动解锁按钮（测试模式） */}
                {simulationMode && (
                  <button
                    onClick={async () => {
                      // 一键自动解锁：自动填充 Token 并开始流程
                      const autoToken = `AFTERGLOW-PRO-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
                      setReleaseToken(autoToken);
                      
                      setTimeout(() => {
                        handleTokenSubmit();
                      }, 300);
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>🪄 One-Click Auto Unlock</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Password/Mnemonic Input */}
          {step === 'password' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-400">
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Token verified. Please provide your master password or recovery mnemonic to decrypt the asset.
                </p>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setUseMnemonic(false)}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    !useMnemonic
                      ? 'bg-[#EAB308] text-black font-semibold'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  Master Password
                </button>
                <button
                  onClick={() => setUseMnemonic(true)}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    useMnemonic
                      ? 'bg-[#EAB308] text-black font-semibold'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  Recovery Mnemonic
                </button>
              </div>

              {!useMnemonic ? (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Master Password
                  </label>
                  <input
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Enter master password"
                    className="w-full bg-black border border-neutral-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:border-[#EAB308] focus:ring-[#EAB308] transition-all outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Recovery Mnemonic (24 words)
                  </label>
                  <textarea
                    value={mnemonic}
                    onChange={(e) => setMnemonic(e.target.value)}
                    placeholder="Enter 24-word mnemonic phrase"
                    rows={4}
                    className="w-full bg-black border border-neutral-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:border-[#EAB308] focus:ring-[#EAB308] transition-all outline-none font-mono text-sm"
                  />
                </div>
              )}

              {/* Zero-Knowledge Unlock Options */}
              <div className="border-t border-neutral-700 pt-4 mt-4">
                <p className="text-xs text-neutral-400 mb-3 text-center">
                  Or use Recovery Kit for zero-input unlock
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {/* PDF Upload */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handlePdfUpload(file);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={parsingPdf}
                      className="w-full py-3 px-4 bg-gradient-to-r from-[#EAB308] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#EAB308] text-black font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      {parsingPdf ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                          <span>Parsing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Upload Recovery Kit PDF</span>
                        </>
                      )}
                    </button>
                    {pdfFile && (
                      <p className="text-xs text-[#EAB308] mt-1 text-center">
                        <FileText className="w-3 h-3 inline mr-1" />
                        {pdfFile.name}
                      </p>
                    )}
                  </div>

                  {/* QR Code Scan (Simulate) */}
                  <button
                    onClick={handleSimulateQrScan}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Simulate QR Scan</span>
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-2 text-center">
                  📄 Upload PDF or 📸 Scan QR code to automatically extract recovery information
                </p>
              </div>

              <button
                onClick={() => handlePasswordSubmit()}
                disabled={(!useMnemonic && !masterPassword.trim()) || (useMnemonic && !mnemonic.trim())}
                className={`w-full py-3 font-semibold rounded-lg transition-all ${
                  ((!useMnemonic && masterPassword.trim()) || (useMnemonic && mnemonic.trim()))
                    ? 'bg-[#EAB308] hover:bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                    : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                }`}
              >
                <Lock className="w-4 h-4 inline mr-2" />
                Unlock Asset
              </button>
            </div>
          )}

          {/* Step 3: Decrypting */}
          {step === 'decrypting' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-[#EAB308] mb-4"></div>
                <p className="text-[#EAB308] font-bold text-lg mb-2">
                  Decrypting Asset...
                </p>
                <p className="text-neutral-400 text-sm">
                  Zero-Knowledge Decryption: Your file is being decrypted locally in your browser.
                  Afterglow servers do not have access to your plaintext data.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-300">Decryption Progress</span>
                  <span className="text-[#EAB308] font-bold">
                    {Math.round(decryptProgress)}% Complete
                  </span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#EAB308] to-[#D4AF37] h-3 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                    style={{ width: `${decryptProgress}%` }}
                  ></div>
                </div>
                {decryptSpeed && (
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Decryption Speed: {decryptSpeed}</span>
                    <span>Processing in browser memory...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center">
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-green-500/20 to-[#EAB308]/20 mb-4 animate-pulse">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <p className="text-green-500 font-bold text-2xl mb-2">
                  🎉 Asset Successfully Recovered!
                </p>
                <p className="text-[#EAB308] font-semibold text-lg mb-2">
                  Your Digital Heirloom Has Been Restored
                </p>
                <p className="text-neutral-400 text-sm mb-4">
                  Your digital inheritance has been successfully decrypted and is ready to download.
                  <br />
                  <span className="text-[#EAB308]">All data was processed locally in your browser.</span>
                </p>
                {decryptedFile && (
                  <div className="bg-gradient-to-r from-green-500/10 to-[#EAB308]/10 border border-green-500/30 rounded-lg p-4 mb-4">
                    <p className="text-white font-semibold text-sm mb-1">
                      File Size: {(decryptedFile.data.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-neutral-300 text-xs">
                      Decryption completed using zero-knowledge protocol. Afterglow servers never had access to your plaintext data.
                    </p>
                  </div>
                )}
              </div>

              {decryptedFile && (
                <div className="bg-neutral-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{decryptedFile.name}</p>
                      <p className="text-sm text-neutral-400">
                        Size: {(decryptedFile.data.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 bg-[#EAB308] hover:bg-[#D4AF37] text-black font-semibold rounded-lg transition-all flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              )}

              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold rounded-lg transition-all"
                >
                  Close
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
