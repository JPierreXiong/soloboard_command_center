/**
 * Inheritance Center Page
 * 遗产继承与解密中心主页面
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, Upload, FileText, CheckCircle, AlertCircle, Lock, Key, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { DecryptionPreview } from './_components/decryption-preview';
import { parsePDFFragment } from '@/shared/lib/pdf-fragment-parser';
import { UpgradePrompt } from '@/shared/components/digital-heirloom/upgrade-prompt';
import { FeatureLock } from '@/shared/components/digital-heirloom/feature-lock';

interface VaultInfo {
  id: string;
  planLevel: 'free' | 'base' | 'pro';
  encryptionHint?: string;
}

interface BeneficiaryInfo {
  id: string;
  name: string;
  email: string;
}

export default function InheritanceCenterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [releaseToken, setReleaseToken] = useState<string>('');
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [beneficiaryInfo, setBeneficiaryInfo] = useState<BeneficiaryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [fragmentAFile, setFragmentAFile] = useState<File | null>(null);
  const [fragmentBFile, setFragmentBFile] = useState<File | null>(null);
  const [fragmentAParsed, setFragmentAParsed] = useState<any>(null);
  const [fragmentBParsed, setFragmentBParsed] = useState<any>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedData, setDecryptedData] = useState<any>(null);
  const [decryptionInfo, setDecryptionInfo] = useState<any>(null);
  const [decryptionMethod, setDecryptionMethod] = useState<'fragment' | 'password'>('fragment');
  const [masterPassword, setMasterPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  useEffect(() => {
    // 从 URL 参数获取 releaseToken
    const token = searchParams.get('token');
    if (token) {
      setReleaseToken(token);
      loadVaultInfo(token);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const loadVaultInfo = async (token: string) => {
    try {
      const response = await fetch(`/api/digital-heirloom/beneficiaries/inheritance-center?releaseToken=${token}`);
      const result = await response.json();

      if (result.code === 0 && result.data) {
        setVaultInfo(result.data.vault);
        setBeneficiaryInfo(result.data.beneficiary);
      } else {
        toast.error(result.message || 'Failed to load vault information');
      }
    } catch (error: any) {
      console.error('Load vault info failed:', error);
      toast.error('Failed to load vault information');
    } finally {
      setLoading(false);
    }
  };

  const handleFragmentAUpload = async (file: File) => {
    try {
      setFragmentAFile(file);
      const parsed = await parsePDFFragment(file);
      setFragmentAParsed(parsed);

      // 如果解析出 Release Token，自动设置
      if (parsed.releaseToken && !releaseToken) {
        setReleaseToken(parsed.releaseToken);
      }

      // 验证 Fragment A
      if (parsed.fragment === 'A' || parsed.fragment === 'full') {
        const response = await fetch('/api/digital-heirloom/beneficiaries/verify-fragment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            releaseToken: parsed.releaseToken || releaseToken,
            fragment: 'A',
            mnemonic: parsed.mnemonic.slice(0, 12),
          }),
        });

        const result = await response.json();
        if (result.code === 0) {
          toast.success('✅ Fragment A 验证成功，请提供 Fragment B 以解锁完整资产');
        }
      }
    } catch (error: any) {
      console.error('Parse Fragment A failed:', error);
      toast.error(`Failed to parse Fragment A: ${error.message}`);
    }
  };

  const handleFragmentBUpload = async (file: File) => {
    try {
      setFragmentBFile(file);
      const parsed = await parsePDFFragment(file);
      setFragmentBParsed(parsed);

      // 验证 Fragment B
      if (parsed.fragment === 'B' || parsed.fragment === 'full') {
        const response = await fetch('/api/digital-heirloom/beneficiaries/verify-fragment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            releaseToken: parsed.releaseToken || releaseToken,
            fragment: 'B',
            mnemonic: parsed.mnemonic.slice(12, 24),
          }),
        });

        const result = await response.json();
        if (result.code === 0) {
          toast.success('✅ Fragment B 验证成功，请提供 Fragment A 以解锁完整资产');
        }
      }
    } catch (error: any) {
      console.error('Parse Fragment B failed:', error);
      toast.error(`Failed to parse Fragment B: ${error.message}`);
    }
  };

  const handleDecrypt = async () => {
    if (!releaseToken) {
      toast.error('Please provide release token');
      return;
    }

    setDecrypting(true);

    try {
      const requestBody: any = {
        releaseToken,
      };

      // 根据解密方式选择
      if (decryptionMethod === 'password') {
        // 使用主密码解密
        if (!masterPassword || masterPassword.trim().length === 0) {
          toast.error('Please enter master password');
          setDecrypting(false);
          return;
        }
        requestBody.masterPassword = masterPassword;
      } else {
        // 使用 Fragment 解密
        if (!fragmentAParsed && !fragmentBParsed) {
          toast.error('Please upload at least one PDF fragment');
          setDecrypting(false);
          return;
        }

        // 根据计划等级决定是否需要两个 Fragment
        const needsBothFragments = vaultInfo?.planLevel === 'pro';

        if (fragmentAParsed && fragmentBParsed) {
          // 使用 Fragment A + B
          requestBody.fragmentA = fragmentAParsed.mnemonic.slice(0, 12);
          requestBody.fragmentB = fragmentBParsed.mnemonic.slice(12, 24);
        } else if (fragmentAParsed && fragmentAParsed.fragment === 'full') {
          // 使用完整助记词（Fragment A 包含全部）
          requestBody.mnemonic = fragmentAParsed.mnemonic;
        } else if (fragmentBParsed && fragmentBParsed.fragment === 'full') {
          // 使用完整助记词（Fragment B 包含全部）
          requestBody.mnemonic = fragmentBParsed.mnemonic;
        } else if (needsBothFragments) {
          toast.error('Pro plan requires both Fragment A and Fragment B');
          setDecrypting(false);
          return;
        } else {
          toast.error('Please upload PDF fragments');
          setDecrypting(false);
          return;
        }
      }

      const response = await fetch('/api/digital-heirloom/beneficiaries/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.code === 0 && result.data) {
        setDecryptedData(result.data.data);
        setDecryptionInfo(result.data.decryptionInfo);
        toast.success('Assets decrypted successfully!');
      } else {
        toast.error(result.message || 'Failed to decrypt assets');
      }
    } catch (error: any) {
      console.error('Decrypt failed:', error);
      toast.error(`Failed to decrypt: ${error.message}`);
    } finally {
      setDecrypting(false);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="w-8 h-8" />
            遗产继承与解密中心
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Inheritance & Decryption Center
          </p>
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 <strong>使用说明</strong>：您可以通过两种方式解密文件：
              <br />
              1. <strong>PDF Fragment</strong>：上传恢复包 PDF 文件（推荐，更安全）
              <br />
              2. <strong>主密码</strong>：直接输入主密码（如果您记得密码）
            </p>
          </div>
        </div>

        {/* 如果已解密，显示预览模式 */}
        {decryptedData && decryptionInfo && (
          <DecryptionPreview
            decryptedData={decryptedData}
            vaultPlanLevel={vaultInfo?.planLevel || 'free'}
            remainingAttempts={decryptionInfo.remainingAttempts}
            isLimitReached={decryptionInfo.isLimitReached}
          />
        )}

        {/* 解密表单 */}
        {!decryptedData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-6">
            {/* Token 输入 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Release Token <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={releaseToken}
                onChange={(e) => setReleaseToken(e.target.value)}
                placeholder="Enter release token or upload PDF to auto-fill"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Release Token 会通过邮件发送给您，或从 PDF 文件中自动提取
              </p>
            </div>

            {/* 解密方式选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                选择解密方式
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDecryptionMethod('fragment')}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    decryptionMethod === 'fragment'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">PDF Fragment</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    使用恢复包 PDF
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setDecryptionMethod('password')}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    decryptionMethod === 'password'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <Key className="w-5 h-5" />
                    <span className="font-medium">主密码</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    直接输入主密码
                  </p>
                </button>
              </div>
            </div>

            {/* 主密码输入区域 */}
            {decryptionMethod === 'password' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  主密码 (Master Password) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Enter the master password"
                    className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {vaultInfo?.encryptionHint && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    💡 提示: {vaultInfo.encryptionHint}
                  </p>
                )}
                <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    ⚠️ 如果您有恢复包 PDF，建议使用 PDF Fragment 方式解密，更加安全。
                  </p>
                </div>
              </div>
            )}

            {/* PDF 上传区域 */}
            {decryptionMethod === 'fragment' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upload Recovery Kit PDF
              </h3>

              {/* Fragment A */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fragment A (Words 1-12) {vaultInfo?.planLevel === 'pro' && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFragmentAUpload(file);
                      }}
                      className="hidden"
                    />
                    <div className="px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex items-center justify-center gap-2">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {fragmentAFile ? fragmentAFile.name : 'Upload Fragment A PDF'}
                      </span>
                    </div>
                  </label>
                  {fragmentAParsed && (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                </div>
              </div>

              {/* Fragment B */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fragment B (Words 13-24) {vaultInfo?.planLevel === 'pro' && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFragmentBUpload(file);
                      }}
                      className="hidden"
                    />
                    <div className="px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex items-center justify-center gap-2">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {fragmentBFile ? fragmentBFile.name : 'Upload Fragment B PDF'}
                      </span>
                    </div>
                  </label>
                  {fragmentBParsed && (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                </div>
              </div>

              {/* 提示信息 */}
              {vaultInfo?.planLevel === 'pro' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 Pro 用户需要上传 2 张 PDF（Fragment A 和 Fragment B）才能解密
                  </p>
                </div>
              )}

              {vaultInfo?.planLevel !== 'pro' && (
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    💡 Free/Base 用户只需上传 1 张包含完整助记词的 PDF
                  </p>
                </div>
              )}
            </div>
            )}

            {/* 解密按钮 */}
            <button
              onClick={handleDecrypt}
              disabled={
                decrypting ||
                !releaseToken ||
                (decryptionMethod === 'fragment' && !fragmentAParsed && !fragmentBParsed) ||
                (decryptionMethod === 'password' && !masterPassword)
              }
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {decrypting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Decrypting...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Decrypt Assets</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
