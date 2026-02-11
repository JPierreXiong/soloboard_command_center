'use client';

import { useTranslations } from 'next-intl';

export function SoloBoardHero() {
  const t = useTranslations('common');

  return (
    <div className="py-20">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          {t('soloboard.title', { default: 'SoloBoard' })}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t('soloboard.description', { default: 'Multi-site monitoring dashboard' })}
        </p>
      </div>
    </div>
  );
}
