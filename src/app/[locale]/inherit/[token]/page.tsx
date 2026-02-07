/**
 * Beneficiary Inheritance Route
 * 受益人专用路由：/inherit/[token]
 * 
 * 功能：
 * 1. 通过 Token 自动识别受益人身份
 * 2. 重定向到遗产继承中心
 * 3. 提供友好的错误提示
 */

import { redirect } from 'next/navigation';
import { authenticateBeneficiary } from '@/shared/lib/beneficiary-auth';

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
}

export default async function BeneficiaryInheritancePage({ params }: PageProps) {
  const { locale, token } = await params;

  // 验证受益人身份
  const authResult = await authenticateBeneficiary(token);

  if (!authResult.valid) {
    // Token 无效，重定向到错误页面
    redirect(`/${locale}/inherit/error?reason=${encodeURIComponent(authResult.reason || 'Invalid token')}`);
  }

  // Token 有效，重定向到遗产继承中心（带 Token）
  redirect(`/${locale}/digital-heirloom/beneficiaries/inheritance-center?token=${token}`);
}
