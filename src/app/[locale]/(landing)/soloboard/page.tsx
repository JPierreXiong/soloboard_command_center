/**
 * SoloBoard - 多站点监控仪表盘
 * 
 * 使用 ShipAny 标准布局（Header + Hero + Footer）
 * 核心原则：不改变 ShipAny 结构
 */

import { getTranslations } from 'next-intl/server';
import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { SoloBoardHero } from './_components/soloboard-hero';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('common');

  return {
    title: `SoloBoard - ${t('metadata.title')}`,
    description: t('metadata.description'),
    alternates: {
      canonical:
        locale !== defaultLocale
          ? `${envConfigs.app_url}/${locale}/soloboard`
          : `${envConfigs.app_url}/soloboard`,
    },
  };
}

export default async function SoloBoardPage() {
  return (
    <div className="container mx-auto">
      <SoloBoardHero />
    </div>
  );
}








