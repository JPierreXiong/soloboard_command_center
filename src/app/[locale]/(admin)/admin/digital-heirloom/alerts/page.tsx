/**
 * Digital Heirloom Alerts History Page
 * 报警历史记录页面
 */

import { getTranslations } from 'next-intl/server';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { AlertsTable } from '@/shared/components/admin/digital-heirloom/alerts-table';
import { Crumb } from '@/shared/types/blocks/common';

export default async function AlertsHistoryPage({
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
    { title: '报警历史', is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title="报警历史记录" />
        <AlertsTable />
      </Main>
    </>
  );
}
