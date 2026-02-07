'use client';

import { useState } from 'react';
import { useRouter } from '@/core/i18n/navigation';
import { useTranslations } from 'next-intl';
import { UserPlus, Mail, Trash2, PlusCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

/**
 * 受益人数据结构
 */
interface Beneficiary {
  id: string;
  name: string;
  email: string;
  relationship: string;
  language: string;
  phone?: string;
  receiverName?: string;
  addressLine1?: string;
  city?: string;
  zipCode?: string;
  countryCode?: string;
}

/**
 * Step 3: 受益人设置页面
 * 
 * 功能：
 * - 添加/删除受益人
 * - 设置关系、语言
 * - 预留 ShipAny 物流字段
 */
export default function Step3BeneficiariesPage() {
  const router = useRouter();
  const t = useTranslations('digital-heirloom.setup.step3');
  
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    {
      id: `beneficiary-${Date.now()}`,
      name: '',
      email: '',
      relationship: 'spouse',
      language: 'en',
      phone: '',
      receiverName: '',
      addressLine1: '',
      city: '',
      zipCode: '',
      countryCode: 'US',
    },
  ]);

  // 添加受益人
  const handleAddBeneficiary = () => {
    setBeneficiaries([
      ...beneficiaries,
      {
        id: `beneficiary-${Date.now()}`,
        name: '',
        email: '',
        relationship: 'friend',
        language: 'en',
        phone: '',
        receiverName: '',
        addressLine1: '',
        city: '',
        zipCode: '',
        countryCode: 'US',
      },
    ]);
  };

  // 删除受益人
  const handleRemoveBeneficiary = (id: string) => {
    if (beneficiaries.length === 1) {
      toast.error(t('actions.error_min_one'));
      return;
    }
    setBeneficiaries(beneficiaries.filter((b) => b.id !== id));
  };

  // 更新受益人
  const handleUpdateBeneficiary = (id: string, field: keyof Beneficiary, value: string) => {
    setBeneficiaries(
      beneficiaries.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  // 验证并继续
  const handleNext = () => {
    // 验证所有受益人
    const invalidBeneficiaries = beneficiaries.filter(
      (b) => !b.name.trim() || !b.email.trim()
    );

    if (invalidBeneficiaries.length > 0) {
      toast.error(t('actions.error_required'));
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = beneficiaries.filter((b) => !emailRegex.test(b.email));

    if (invalidEmails.length > 0) {
      toast.error(t('actions.error_email'));
      return;
    }

    // 保存到 sessionStorage
    if (typeof window !== 'undefined') {
      const setupData = JSON.parse(sessionStorage.getItem('digital-heirloom-setup') || '{}');
      setupData.step = 3;
      setupData.beneficiaries = beneficiaries;
      sessionStorage.setItem('digital-heirloom-setup', JSON.stringify(setupData));
    }

    // 跳转到下一步（使用 i18n-aware router，自动包含 locale 前缀）
    router.push('/digital-heirloom/setup/step-4-trigger');
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {beneficiaries.map((beneficiary, index) => (
          <Card key={beneficiary.id} className="relative group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('beneficiary.title', { index: index + 1 })}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveBeneficiary(beneficiary.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 姓名 */}
                <div className="space-y-2">
                  <Label>{t('beneficiary.name')}</Label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      placeholder={t('beneficiary.name_placeholder')}
                      value={beneficiary.name}
                      onChange={(e) => handleUpdateBeneficiary(beneficiary.id, 'name', e.target.value)}
                    />
                  </div>
                </div>

                {/* 邮箱 */}
                <div className="space-y-2">
                  <Label>{t('beneficiary.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      className="pl-10"
                      placeholder={t('beneficiary.email_placeholder')}
                      value={beneficiary.email}
                      onChange={(e) => handleUpdateBeneficiary(beneficiary.id, 'email', e.target.value)}
                    />
                  </div>
                </div>

                {/* 通知语言 */}
                <div className="space-y-2">
                  <Label>{t('beneficiary.language')}</Label>
                  <Select
                    value={beneficiary.language}
                    onValueChange={(value) => handleUpdateBeneficiary(beneficiary.id, 'language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">{t('languages.zh')}</SelectItem>
                      <SelectItem value="en">{t('languages.en')}</SelectItem>
                      <SelectItem value="fr">{t('languages.fr')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 关系 */}
                <div className="space-y-2">
                  <Label>{t('beneficiary.relationship')}</Label>
                  <Select
                    value={beneficiary.relationship}
                    onValueChange={(value) => handleUpdateBeneficiary(beneficiary.id, 'relationship', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">{t('relationships.spouse')}</SelectItem>
                      <SelectItem value="child">{t('relationships.child')}</SelectItem>
                      <SelectItem value="parent">{t('relationships.parent')}</SelectItem>
                      <SelectItem value="sibling">{t('relationships.sibling')}</SelectItem>
                      <SelectItem value="lawyer">{t('relationships.lawyer')}</SelectItem>
                      <SelectItem value="friend">{t('relationships.friend')}</SelectItem>
                      <SelectItem value="other">{t('relationships.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 手机号（可选） */}
                <div className="space-y-2">
                  <Label>{t('beneficiary.phone')}</Label>
                  <Input
                    type="tel"
                    placeholder={t('beneficiary.phone_placeholder')}
                    value={beneficiary.phone || ''}
                    onChange={(e) => handleUpdateBeneficiary(beneficiary.id, 'phone', e.target.value)}
                  />
                </div>
              </div>

              {/* ShipAny 物流预留字段（可选，用于未来扩展） */}
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">
                  {t('beneficiary.logistics_title')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('beneficiary.receiver_name')}</Label>
                    <Input
                      placeholder={t('beneficiary.receiver_name_placeholder')}
                      value={beneficiary.receiverName || ''}
                      onChange={(e) => handleUpdateBeneficiary(beneficiary.id, 'receiverName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('beneficiary.address')}</Label>
                    <Input
                      placeholder={t('beneficiary.address_placeholder')}
                      value={beneficiary.addressLine1 || ''}
                      onChange={(e) => handleUpdateBeneficiary(beneficiary.id, 'addressLine1', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('beneficiary.city')}</Label>
                    <Input
                      placeholder={t('beneficiary.city_placeholder')}
                      value={beneficiary.city || ''}
                      onChange={(e) => handleUpdateBeneficiary(beneficiary.id, 'city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('beneficiary.zip_code')}</Label>
                    <Input
                      placeholder={t('beneficiary.zip_code_placeholder')}
                      value={beneficiary.zipCode || ''}
                      onChange={(e) => handleUpdateBeneficiary(beneficiary.id, 'zipCode', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 添加受益人按钮 */}
      <Button
        variant="outline"
        onClick={handleAddBeneficiary}
        className="w-full border-dashed mb-6"
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        {t('actions.add_beneficiary')}
      </Button>

      {/* 导航按钮 */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('actions.back')}
        </Button>
        <Button
          onClick={handleNext}
          size="lg"
        >
          {t('actions.next')}
        </Button>
      </div>
    </div>
  );
}



