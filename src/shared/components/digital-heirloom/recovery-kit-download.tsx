'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import type { RecoveryKit } from '@/shared/lib/recovery-kit';
import { generateRecoveryKitPDFContent } from '@/shared/lib/recovery-kit';

interface RecoveryKitDownloadProps {
  kit: RecoveryKit;
  onDownload: () => void;
}

/**
 * 恢复包下载组件
 * 显示助记词并提供 PDF 下载功能
 */
export function RecoveryKitDownload({ kit, onDownload }: RecoveryKitDownloadProps) {
  const t = useTranslations('digital-heirloom.recovery_kit');
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Use new PDF generator (full-color professional PDF)
      const { downloadRecoveryKitPDF } = await import('@/shared/lib/recovery-kit-pdf');
      await downloadRecoveryKitPDF(kit);
      
      setDownloaded(true);
      onDownload();
    } catch (error) {
      console.error('Failed to download recovery kit PDF:', error);
      // Fallback to text format if PDF generation fails
      try {
        const pdfContent = generateRecoveryKitPDFContent(kit);
        const blob = new Blob([pdfContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Digital-Heirloom-Recovery-Kit-${kit.vaultId.slice(0, 8)}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setDownloaded(true);
        onDownload();
      } catch (fallbackError) {
        console.error('Failed to download recovery kit (fallback):', fallbackError);
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
          <AlertCircle className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription className="text-amber-800 dark:text-amber-200">
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>{t('important_title')}</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>{t('important_points.point1')}</li>
              <li>{t('important_points.point2')}</li>
              <li>{t('important_points.point3')}</li>
              <li>{t('important_points.point4')}</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="font-semibold mb-3 text-sm">{t('mnemonic_title')}</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {kit.mnemonicArray.map((word, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded"
              >
                <span className="text-gray-500 dark:text-gray-400 text-xs w-6">
                  {String(index + 1).padStart(2, '0')}.
                </span>
                <span className="font-mono font-medium">{word}</span>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleDownload}
          disabled={downloading || downloaded}
          className="w-full"
          variant={downloaded ? 'outline' : 'default'}
        >
          {downloading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              {t('downloading')}
            </>
          ) : downloaded ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t('downloaded')}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {t('download_button')}
            </>
          )}
        </Button>

        {downloaded && (
          <p className="text-sm text-green-600 dark:text-green-400 text-center">
            {t('download_success')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}



