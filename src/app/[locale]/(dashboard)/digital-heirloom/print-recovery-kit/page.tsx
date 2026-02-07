/**
 * Digital Heirloom - Recovery Kit Print Template
 * Heirloom-Gold 风格打印模板
 * 
 * 基于参考文件结构设计，支持 Fragment A 和 Fragment B 分片打印
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HeirloomDocument } from '@/shared/components/digital-heirloom/heirloom-document';
import '@/config/style/heirloom-print.css';

interface RecoveryKitData {
  documentId: string;
  generatedAt: string;
  expiresAt: string;
  beneficiary: string;
  beneficiaryLanguage?: string; // 'en' | 'zh' | 'fr'
  mnemonicA: string[]; // 前12个助记词
  mnemonicB: string[]; // 后12个助记词
  checksumA: string;
  checksumB: string;
  vaultId: string;
  beneficiaryId?: string | null;
}

export default function PrintRecoveryKitPage() {
  const searchParams = useSearchParams();
  const [kitData, setKitData] = useState<RecoveryKitData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 API 获取真实的恢复包数据
    const fetchPrintData = async () => {
      try {
        const vaultId = searchParams.get('vaultId');
        const beneficiaryId = searchParams.get('beneficiaryId');
        const mnemonic = searchParams.get('mnemonic'); // 客户端传递的助记词（可选）

        if (!vaultId) {
          setLoading(false);
          return;
        }

        // 构建 API URL
        const apiUrl = new URL('/api/digital-heirloom/recovery-kit/print-data', window.location.origin);
        apiUrl.searchParams.set('vaultId', vaultId);
        if (beneficiaryId) {
          apiUrl.searchParams.set('beneficiaryId', beneficiaryId);
        }
        if (mnemonic) {
          apiUrl.searchParams.set('mnemonic', mnemonic);
        }

        const response = await fetch(apiUrl.toString(), {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch recovery kit data');
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        setKitData(result.data);
      } catch (error) {
        console.error('Failed to fetch recovery kit print data:', error);
        // 如果 API 调用失败，仍然设置加载完成（显示错误）
      } finally {
        setLoading(false);
      }
    };

    fetchPrintData();
  }, [searchParams]);

  if (loading) {
    return <div className="p-8">加载中...</div>;
  }

  if (!kitData) {
    return <div className="p-8">恢复包数据不存在</div>;
  }

  return (
    <div className="bg-parchment min-h-screen">
      {/* 打印控制按钮 - 仅屏幕显示 */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="bg-[#d4af37] text-white px-6 py-2 font-semibold tracking-wide hover:bg-[#c9a227] transition-colors"
        >
          打印文档
        </button>
      </div>

      {/* Fragment A */}
      <HeirloomDocument
        fragment="A"
        documentId={kitData.documentId}
        generatedAt={kitData.generatedAt}
        expiresAt={kitData.expiresAt}
        beneficiary={kitData.beneficiary}
        keyContent={kitData.mnemonicA}
        checksum={kitData.checksumA}
        language={kitData.beneficiaryLanguage || 'en'}
      />

      <div className="page-break" />

      {/* Fragment B */}
      <HeirloomDocument
        fragment="B"
        documentId={kitData.documentId}
        generatedAt={kitData.generatedAt}
        expiresAt={kitData.expiresAt}
        beneficiary={kitData.beneficiary}
        keyContent={kitData.mnemonicB}
        checksum={kitData.checksumB}
        language={kitData.beneficiaryLanguage || 'en'}
      />
    </div>
  );
}

