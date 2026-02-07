'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/core/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Clock, ShieldAlert, CheckCircle2, Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Slider } from '@/shared/components/ui/slider';

/**
 * Step 4: 触发逻辑与最终确认
 * 
 * 功能：
 * - 设置心跳频率
 * - 设置宽限期
 * - 流程预览
 * - 最终提交
 */
export default function Step4TriggerPage() {
  const router = useRouter();
  const t = useTranslations('digital-heirloom.setup.step4');
  
  const [frequency, setFrequency] = useState(90);
  const [gracePeriod, setGracePeriod] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  // 从 sessionStorage 获取之前步骤的数据
  const [setupData, setSetupData] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = sessionStorage.getItem('digital-heirloom-setup');
      if (data) {
        setSetupData(JSON.parse(data));
      } else {
        // 如果没有数据，返回第一步
        toast.error(t('actions.error_no_data'));
        router.push('/digital-heirloom/setup/step-1-master-password');
      }
    }
  }, [router, t]);

  // 最终提交
  const handleFinalSubmit = async () => {
    if (!setupData) {
      toast.error(t('actions.error_incomplete'));
      return;
    }

    setSubmitting(true);

    try {
      // 构建提交数据
      const payload = {
        vaultData: {
          encryptedData: setupData.encryptedData,
          encryptionSalt: setupData.encryptionSalt,
          encryptionIv: setupData.encryptionIv,
          recoveryBackupToken: setupData.recoveryKit?.backupToken,
          recoveryBackupSalt: setupData.recoveryKit?.backupSalt,
          recoveryBackupIv: setupData.recoveryKit?.backupIv,
          encryptionHint: setupData.hint || '',
        },
        beneficiaries: setupData.beneficiaries || [],
        settings: {
          heartbeatFrequency: frequency,
          gracePeriod: gracePeriod,
          deadManSwitchEnabled: true,
        },
      };

      // 调用聚合 API
      const response = await fetch('/api/digital-heirloom/vault/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      // 处理"保险箱已存在"的情况：视为成功，直接跳转
      if (response.status === 400 && result.message?.includes('already have a digital vault')) {
        console.log('Vault already exists, treating as success and redirecting...');
        // 清理本地数据
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('digital-heirloom-setup');
        }
        toast.success(t('actions.success'));
        setTimeout(() => {
          window.location.href = '/digital-heirloom/vault';
        }, 1000);
        return;
      }

      // 检查响应格式：respData 返回 { code: 0, message: 'ok', data: {...} }
      // 注意：respData 使用 statusCode 200，但 code 是 0（成功）或 -1（失败）
      if (!response.ok) {
        console.error('Vault initialization failed (HTTP error):', response.status, result);
        
        // 如果是 500 错误，检查是否是心跳日志失败（非关键错误）
        if (response.status === 500) {
          const errorMessage = result.message || '';
          
          // 检查是否是心跳日志相关的错误（非关键）
          if (errorMessage.includes('heartbeat') || errorMessage.includes('heartbeat_logs')) {
            console.warn('Heartbeat log creation failed (non-critical), but vault may have been created');
            // 尝试检查 Vault 是否已创建，如果已创建则继续流程
            try {
              const vaultCheckResponse = await fetch('/api/digital-heirloom/vault/get');
              const vaultCheckResult = await vaultCheckResponse.json();
              if (vaultCheckResult.code === 0 && vaultCheckResult.data?.vault) {
                // Vault 已创建成功，心跳日志失败不影响主流程
                console.log('Vault created successfully despite heartbeat log failure, continuing...');
                // 继续正常流程，不抛出错误
              } else {
                throw new Error('Vault creation failed');
              }
            } catch (checkError) {
              // 如果检查也失败，抛出原始错误
              if (errorMessage.includes('schema not initialized')) {
                throw new Error('Database schema not initialized. Please run database migrations first.');
              }
              throw new Error(errorMessage || `Initialization failed (HTTP ${response.status})`);
            }
          } else if (errorMessage.includes('schema not initialized')) {
            throw new Error('Database schema not initialized. Please run database migrations first.');
          } else {
            throw new Error(errorMessage || `Initialization failed (HTTP ${response.status})`);
          }
        } else {
          throw new Error(result.message || `Initialization failed (HTTP ${response.status})`);
        }
      }

      // 检查业务逻辑错误（code !== 0）
      if (result.code !== 0) {
        console.error('Vault initialization failed (business error):', result);
        throw new Error(result.message || 'Initialization failed');
      }

      // 验证返回的数据（如果成功创建了新保险箱）
      if (result.data && result.data.vault) {
        // 新保险箱创建成功，继续正常流程
      } else {
        // 如果没有返回 vault 数据，但也没有错误，可能是其他成功情况
        console.log('Vault initialization completed without vault data in response');
      }

      // 清理本地数据（安全考虑）
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('digital-heirloom-setup');
      }

      toast.success(t('actions.success'));
      
      // 跳转到 Vault 页面（流程完成，用户应该看到资产管理界面）
      // 使用 window.location.href 确保完整页面跳转，避免客户端路由延迟
      // 这会触发完整的页面刷新，确保 vault 数据已完全写入数据库
      setTimeout(() => {
        window.location.href = '/digital-heirloom/vault';
      }, 1500);
    } catch (error: any) {
      console.error('Final submit error:', error);
      toast.error(error.message || 'Submission failed, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (!setupData) {
    return (
      <div className="container max-w-3xl mx-auto py-8 px-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>{t('actions.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            {t('heartbeat.title')}
          </CardTitle>
          <CardDescription>
            {t('heartbeat.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('heartbeat.threshold')}
              </p>
            </div>
            <span className="text-3xl font-mono font-bold text-blue-500">
              {t('heartbeat.days', { days: frequency })}
            </span>
          </div>

          <div className="space-y-2">
            <Slider
              value={[frequency]}
              onValueChange={(value) => setFrequency(value[0])}
              min={30}
              max={365}
              step={30}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>{t('heartbeat.labels.1_month')}</span>
              <span>{t('heartbeat.labels.3_months')}</span>
              <span>{t('heartbeat.labels.6_months')}</span>
              <span>{t('heartbeat.labels.1_year')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            {t('grace_period.title')}
          </CardTitle>
          <CardDescription>
            {t('grace_period.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('grace_period.label')}
              </p>
            </div>
            <span className="text-3xl font-mono font-bold text-amber-500">
              {t('grace_period.days', { days: gracePeriod })}
            </span>
          </div>

          <div className="space-y-2">
            <Slider
              value={[gracePeriod]}
              onValueChange={(value) => setGracePeriod(value[0])}
              min={1}
              max={30}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>{t('grace_period.labels.1_day')}</span>
              <span>{t('grace_period.labels.7_days')}</span>
              <span>{t('grace_period.labels.15_days')}</span>
              <span>{t('grace_period.labels.30_days')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 流程可视化预览 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {t('preview.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
            <div className="relative">
              <div className="absolute -left-8 p-1 bg-background">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              </div>
              <p className="font-medium">{t('preview.step1', { days: frequency })}</p>
              <p className="text-sm text-muted-foreground">
                {t('preview.step1_desc')}
              </p>
            </div>

            <div className="relative">
              <div className="absolute -left-8 p-1 bg-background">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
              </div>
              <p className="font-medium">{t('preview.step2', { days: gracePeriod })}</p>
              <p className="text-sm text-muted-foreground">
                {t('preview.step2_desc')}
              </p>
            </div>

            <div className="relative">
              <div className="absolute -left-8 p-1 bg-background">
                <Heart className="h-5 w-5 text-rose-500" />
              </div>
              <p className="font-medium">{t('preview.step3')}</p>
              <p className="text-sm text-muted-foreground">
                {t('preview.step3_desc')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 最终提交按钮 */}
      <Button
        onClick={handleFinalSubmit}
        disabled={submitting}
        className="w-full py-6 text-lg font-bold shadow-lg"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            {t('actions.submitting')}
          </>
        ) : (
          t('actions.submit')
        )}
      </Button>

      {submitting && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          {t('actions.submitting_desc')}
        </p>
      )}
    </div>
  );
}



