import { getTranslations } from 'next-intl/server';

import { requireAdminAccess } from '@/core/rbac/permission';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import { Crumb } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';
import { ShippingRequestList } from './_components/shipping-request-list';

export default async function AdminShippingRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: number;
    pageSize?: number;
    status?: string;
    feeStatus?: string;
  }>;
}) {
  const { locale } = await params;

  // Check admin access
  await requireAdminAccess({
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.shipping');

  const { page: pageNum, pageSize, status, feeStatus } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 20;

  const crumbs: Crumb[] = [
    { title: 'Admin', url: '/admin' },
    { title: 'Shipping Requests', is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title="物流寄送审核" />
        <ShippingRequestList
          page={page}
          limit={limit}
          status={status}
          feeStatus={feeStatus}
        />
      </Main>
    </>
  );
}




