/**
 * Digital Heirloom Security Monitoring Page
 * 安全监控页面
 */

import { getTranslations } from 'next-intl/server';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { SecurityMonitoring } from '@/shared/components/admin/digital-heirloom/security-monitoring';
import { Crumb } from '@/shared/types/blocks/common';

export default async function SecurityMonitoringPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 检查管理员权限
  await requirePermission({
    code: PERMISSIONS.ADMIN_ACCESS,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin');

  const crumbs: Crumb[] = [
    { title: t('sidebar.header.brand.title'), url: '/admin' },
    { title: 'Digital Heirloom', url: '/admin/digital-heirloom' },
    { title: '安全监控', is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title="安全监控" />
        <SecurityMonitoring />
      </Main>
    </>
  );
}
