/**
 * Test Hub - 继承流程测试工具
 * 
 * 功能：
 * 1. 触发 Dead Man's Switch
 * 2. 模拟受益人解锁
 * 3. 模拟 ShipAny 物理寄送
 * 4. 下载 Recovery Kit
 */

'use client';

import React, { useState } from 'react';
import { AlertTriangle, Package, Download, User, TestTube, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { BeneficiaryUnlock } from './beneficiary-unlock';
import { ShipAnySimulator } from './shipany-simulator';
import { BeneficiaryEmailSimulator } from './beneficiary-email-simulator';

interface TestHubProps {
  vaultId: string;
  onTriggerInheritance?: () => void;
}

export function TestHub({ vaultId, onTriggerInheritance }: TestHubProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBeneficiaryUnlock, setShowBeneficiaryUnlock] = useState(false);
  const [showShipAnySimulator, setShowShipAnySimulator] = useState(false);
  const [showEmailSimulator, setShowEmailSimulator] = useState(false);
  const [simulatedToken, setSimulatedToken] = useState<string | null>(null);
  const [simulationMode, setSimulationMode] = useState(false);

  const handleTriggerInheritance = async () => {
    if (!confirm('Are you sure you want to trigger the Dead Man\'s Switch? This will activate the inheritance process.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/digital-heirloom/vault/trigger-inheritance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success('Dead Man\'s Switch triggered successfully!');
        
        // 获取 Release Token
        if (result.data?.beneficiaries?.[0]?.releaseToken) {
          setSimulatedToken(result.data.beneficiaries[0].releaseToken);
          setShowEmailSimulator(true);
        } else {
          // 如果没有 Token，生成一个测试 Token
          const testToken = `TEST-TOKEN-${Date.now().toString(36).toUpperCase()}`;
          setSimulatedToken(testToken);
          setSimulationMode(true);
          setShowEmailSimulator(true);
          toast.info('Cloud connection failed, simulating local inheritance...');
        }
        
        onTriggerInheritance?.();
      } else {
        // API 失败，启用模拟模式
        console.warn('API failed, enabling simulation mode:', result.message);
        const testToken = `AFTERGLOW-PRO-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        setSimulatedToken(testToken);
        setSimulationMode(true);
        setShowEmailSimulator(true);
        toast.warning('Cloud connection failed, simulating local inheritance...');
      }
    } catch (error: any) {
      console.error('Trigger inheritance error:', error);
      // 网络错误，启用模拟模式
      const testToken = `AFTERGLOW-PRO-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      setSimulatedToken(testToken);
      setSimulationMode(true);
      setShowEmailSimulator(true);
      toast.warning('Cloud connection failed, simulating local inheritance...');
    } finally {
      setLoading(false);
    }
  };

  const handleMockShipAny = async () => {
    setShowShipAnySimulator(true);
  };

  const handleDownloadRecoveryKit = async () => {
    try {
      // 获取 Vault 信息
      const vaultResponse = await fetch('/api/digital-heirloom/vault/get');
      const vaultResult = await vaultResponse.json();

      if (vaultResult.code === 0 && vaultResult.data?.vault) {
        const vault = vaultResult.data.vault;
        
        // 提示用户输入主密码
        const masterPassword = prompt('Please enter your master password to generate Recovery Kit:');
        if (!masterPassword) {
          return;
        }

        // 生成 Recovery Kit
        const { generateRecoveryKit } = await import('@/shared/lib/recovery-kit');
        const { downloadRecoveryKitPDF } = await import('@/shared/lib/recovery-kit-pdf');
        
        const recoveryKit = await generateRecoveryKit(masterPassword, vaultId);
        
        // 获取受益人名称（如果有）
        const beneficiaryName = vaultResult.data.beneficiaries?.[0]?.name;
        
        // 下载 PDF
        await downloadRecoveryKitPDF(recoveryKit, beneficiaryName);
        toast.success('Recovery Kit PDF downloaded successfully!');
      } else {
        toast.error('Failed to get vault information');
      }
    } catch (error: any) {
      console.error('Download Recovery Kit error:', error);
      toast.error(error.message || 'Failed to download Recovery Kit');
    }
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 left-6 z-50 p-4 bg-[#EAB308] hover:bg-[#D4AF37] text-black rounded-full shadow-lg hover:shadow-xl transition-all ${
          isOpen ? 'rotate-45' : ''
        }`}
        style={{
          boxShadow: '0 0 20px rgba(234, 179, 8, 0.5)',
        }}
      >
        <TestTube className="w-6 h-6" />
      </button>

      {/* 测试面板 */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 z-50 w-80 bg-neutral-900 border-2 border-[#EAB308] rounded-lg shadow-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#EAB308] flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Test Hub
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="space-y-2">
            {/* 触发 Dead Man's Switch */}
            <button
              onClick={handleTriggerInheritance}
              disabled={loading}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" />
              Trigger Dead Man's Switch
            </button>

            {/* 模拟受益人解锁 */}
            <button
              onClick={() => {
                if (simulatedToken) {
                  setShowBeneficiaryUnlock(true);
                } else {
                  toast.info('Please trigger inheritance first to get a release token');
                }
              }}
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <User className="w-4 h-4" />
              Simulate Beneficiary Unlock
            </button>

            {/* 查看模拟邮件 */}
            {simulatedToken && (
              <button
                onClick={() => setShowEmailSimulator(true)}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                View Beneficiary Email
              </button>
            )}

            {/* 模拟 ShipAny 寄送 */}
            <button
              onClick={handleMockShipAny}
              disabled={loading}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Package className="w-4 h-4" />
              Mock ShipAny Fulfillment
            </button>

            {/* 下载 Recovery Kit */}
            <button
              onClick={handleDownloadRecoveryKit}
              disabled={loading}
              className="w-full px-4 py-3 bg-[#EAB308] hover:bg-[#D4AF37] text-black font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download Recovery Kit
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-700">
            <p className="text-xs text-neutral-500">
              ⚠️ Test tools for development only
            </p>
          </div>
        </div>
      )}

      {/* Beneficiary Unlock Modal */}
      {showBeneficiaryUnlock && (
        <BeneficiaryUnlock
          releaseToken={simulatedToken || undefined}
          simulationMode={simulationMode}
          vaultId={vaultId}
          onClose={() => setShowBeneficiaryUnlock(false)}
        />
      )}

      {/* Email Simulator Modal */}
      {showEmailSimulator && simulatedToken && (
        <BeneficiaryEmailSimulator
          releaseToken={simulatedToken}
          onUseToken={(token) => {
            setSimulatedToken(token);
            setShowBeneficiaryUnlock(true);
          }}
          onClose={() => setShowEmailSimulator(false)}
        />
      )}

      {/* ShipAny Simulator Modal */}
      {showShipAnySimulator && (
        <ShipAnySimulator
          vaultId={vaultId}
          onClose={() => setShowShipAnySimulator(false)}
        />
      )}
    </>
  );
}
