'use client';

import { useState } from 'react';
import { useRouter } from '@/core/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { generateRecoveryKit } from '@/shared/lib/recovery-kit';
import { RecoveryKitDownload } from '@/shared/components/digital-heirloom/recovery-kit-download';
import type { RecoveryKit } from '@/shared/lib/recovery-kit';

/**
 * Step 1: 主密码设置页面
 * 
 * 功能：
 * - 密码输入和强度验证
 * - 密码确认
 * - 密码提示输入
 * - 恢复包生成和下载（阻塞式）
 */
export default function MasterPasswordStepPage() {
  const router = useRouter();
  const t = useTranslations('digital-heirloom.setup.step1');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hintQuestion, setHintQuestion] = useState<string>('custom');
  const [hintAnswer, setHintAnswer] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recoveryKit, setRecoveryKit] = useState<RecoveryKit | null>(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  // 密码强度计算
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (pwd.length === 0) return { score: 0, label: '', color: 'gray' };
    if (pwd.length < 8) return { score: 1, label: t('password_too_short'), color: 'red' };
    
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z\d]/.test(pwd)) score++;
    
    if (score <= 2) return { score, label: t('password_weak'), color: 'red' };
    if (score <= 3) return { score, label: t('password_medium'), color: 'yellow' };
    return { score, label: t('password_strong'), color: 'green' };
  };

  // 构建密码提示（问题 + 答案）
  const getHint = (): string => {
    if (hintQuestion === 'custom') {
      return hintAnswer;
    }
    const question = t(`hint_questions.${hintQuestion}` as any);
    return `${question} ${hintAnswer}`;
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  // 生成恢复包
  const handleGenerateKit = async () => {
    if (password.length < 8) {
      toast.error(t('password_requirements.min_length'));
      return;
    }

    if (!passwordsMatch) {
      toast.error(t('passwords_mismatch'));
      return;
    }

    setGenerating(true);
    try {
      // 生成临时 vaultId（实际应在创建保险箱时生成）
      const tempVaultId = `temp-${Date.now()}`;
      
      // 生成恢复包
      const kit = await generateRecoveryKit(password, tempVaultId);
      setRecoveryKit(kit);
      
      toast.success('Recovery package generated');
    } catch (error) {
      console.error('Failed to generate recovery kit:', error);
      toast.error('Failed to generate recovery package, please try again');
    } finally {
      setGenerating(false);
    }
  };

  // 继续到下一步
  const handleNext = () => {
    if (!recoveryKit) {
      toast.error('Please generate recovery package first');
      return;
    }

    if (!hasDownloaded) {
      toast.error('Please download recovery package first');
      return;
    }

    if (!hasConfirmed) {
      toast.error('Please confirm you have safely saved the recovery package');
      return;
    }

    // 将恢复包数据存储到 sessionStorage（临时，实际应通过 API 存储）
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('digital-heirloom-setup', JSON.stringify({
        step: 1,
        password, // 注意：实际不应存储密码，这里仅用于演示流程
        hint: getHint(),
        recoveryKit: {
          backupToken: recoveryKit.backupToken,
          backupSalt: recoveryKit.backupSalt,
          backupIv: recoveryKit.backupIv,
        },
      }));
    }

    // 跳转到下一步
    router.push('/digital-heirloom/setup/step-2-assets');
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t('card_title')}
          </CardTitle>
          <CardDescription>
            {t('card_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 密码强度要求说明 */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('password_requirements.title')}</span>
                <button
                  type="button"
                  onClick={() => setShowPasswordRequirements(!showPasswordRequirements)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showPasswordRequirements ? 'Hide' : 'Show'} Details
                </button>
              </div>
              {showPasswordRequirements && (
                <ul className="mt-2 space-y-1 text-xs list-disc list-inside">
                  <li>{t('password_requirements.min_length')}</li>
                  <li className="font-medium">{t('password_requirements.recommended')}</li>
                  <li>{t('password_requirements.length_12')}</li>
                  <li>{t('password_requirements.uppercase')}</li>
                  <li>{t('password_requirements.lowercase')}</li>
                  <li>{t('password_requirements.numbers')}</li>
                  <li>{t('password_requirements.special')}</li>
                </ul>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {t('password_requirements.note')}
              </p>
            </AlertDescription>
          </Alert>

          {/* 密码输入 */}
          <div className="space-y-2">
            <Label htmlFor="password">{t('password_label')}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {/* 密码强度指示器 */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{t('password_strength')}:</span>
                  <span className={`font-medium ${
                    passwordStrength.color === 'red' ? 'text-red-600' :
                    passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      passwordStrength.color === 'red' ? 'bg-red-500' :
                      passwordStrength.color === 'yellow' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 确认密码 */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirm_password_label')}</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('confirm_password_placeholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {t('passwords_mismatch')}
              </p>
            )}
            {passwordsMatch && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {t('passwords_match')}
              </p>
            )}
          </div>

          {/* 密码提示 */}
          <div className="space-y-2">
            <Label htmlFor="hintQuestion">{t('hint_label')}</Label>
            <Select value={hintQuestion} onValueChange={setHintQuestion}>
              <SelectTrigger>
                <SelectValue placeholder={t('hint_questions.label')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">{t('hint_questions.custom')}</SelectItem>
                <SelectItem value="question1">{t('hint_questions.question1')}</SelectItem>
                <SelectItem value="question2">{t('hint_questions.question2')}</SelectItem>
                <SelectItem value="question3">{t('hint_questions.question3')}</SelectItem>
                <SelectItem value="question4">{t('hint_questions.question4')}</SelectItem>
                <SelectItem value="question5">{t('hint_questions.question5')}</SelectItem>
              </SelectContent>
            </Select>
            {hintQuestion !== 'custom' && (
              <Input
                id="hintAnswer"
                type="text"
                placeholder={`Answer: ${t(`hint_questions.${hintQuestion}` as any)}`}
                value={hintAnswer}
                onChange={(e) => setHintAnswer(e.target.value)}
              />
            )}
            {hintQuestion === 'custom' && (
              <Input
                id="hint"
                type="text"
                placeholder={t('hint_placeholder')}
                value={hintAnswer}
                onChange={(e) => setHintAnswer(e.target.value)}
              />
            )}
            <p className="text-xs text-muted-foreground">
              {t('hint_description')}
            </p>
          </div>

          {/* 生成恢复包按钮 */}
          {!recoveryKit && (
            <Button
              onClick={handleGenerateKit}
              disabled={!passwordsMatch || password.length < 8 || generating}
              className="w-full"
              size="lg"
            >
              {generating ? t('generating_kit') : t('generate_kit')}
            </Button>
          )}

          {/* 恢复包下载 */}
          {recoveryKit && (
            <>
              <RecoveryKitDownload
                kit={recoveryKit}
                onDownload={() => setHasDownloaded(true)}
              />

              {/* 确认复选框 */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <Checkbox
                  id="confirm-saved"
                  checked={hasConfirmed}
                  onCheckedChange={(checked) => setHasConfirmed(checked === true)}
                  className="mt-1"
                />
                <Label
                  htmlFor="confirm-saved"
                  className="text-sm cursor-pointer leading-relaxed"
                >
                  {t('confirm_saved')}
                </Label>
              </div>

              {/* 继续按钮 */}
              <Button
                onClick={handleNext}
                disabled={!hasDownloaded || !hasConfirmed}
                className="w-full"
                size="lg"
              >
                {t('continue_next')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



