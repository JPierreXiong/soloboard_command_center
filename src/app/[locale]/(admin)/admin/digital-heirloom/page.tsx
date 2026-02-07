/**
 * Digital Heirloom Admin Dashboard Page
 * 管理员看板首页
 */

import { getTranslations } from 'next-intl/server';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { DashboardContent } from '@/shared/components/admin/digital-heirloom/dashboard-content';
import { AlertBanner } from '@/shared/components/admin/digital-heirloom/alert-banner';
import { Crumb } from '@/shared/types/blocks/common';

export default async function DigitalHeirloomAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 检查管理员权限
  await requirePermission({
    code: PERMISSIONS.ADMIN_ACCESS, // 使用现有的管理员权限
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin');

  const crumbs: Crumb[] = [
    { title: t('sidebar.header.brand.title'), url: '/admin' },
    { title: 'Digital Heirloom', is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <AlertBanner />
      <Main>
        <MainHeader title="Digital Heirloom 管理看板" />
        <DashboardContent />
      </Main>
    </>
  );
}
