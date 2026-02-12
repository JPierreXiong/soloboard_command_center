import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { Landing } from '@/shared/types/blocks/landing';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // load page data
  const t = await getTranslations('landing');

  // build page params
  const page: Landing = {
    hero: {
      ...t.raw('hero'),
      // 关闭可能导致误会的"后台截图"图片，符合 Creem 合规要求
      image: undefined,
      image_invert: undefined,
      // 确保不显示虚假用户头像
      show_avatars: false,
    },
    // 明确设为 undefined 阻止 UI 渲染
    logos: undefined,
    introduce: undefined,
    benefits: undefined,
    usage: undefined,
    stats: undefined,
    
    // SoloBoard: 显示功能区块
    'how-it-works': t.raw('how-it-works'),
    features: t.raw('features'),
    
    // 隐藏用户评价
    testimonials: undefined,
    
    // 可选保留的区块
    subscribe: t.raw('subscribe'),
    faq: t.raw('faq'),
    cta: t.raw('cta'), // 激活 CTA 区块
  };

  // load page component
  const Page = await getThemePage('landing');

  return <Page locale={locale} page={page} />;
}
