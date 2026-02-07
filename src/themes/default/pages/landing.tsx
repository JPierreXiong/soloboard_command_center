import Script from 'next/script';

import { envConfigs } from '@/config';
import { Landing } from '@/shared/types/blocks/landing';
import {
  CTA,
  FAQ,
  Features,
  Hero,
  ZeroKnowledgeSecurity,
} from '@/themes/default/blocks';

export default async function LandingPage({
  locale,
  page,
}: {
  locale?: string;
  page: Landing;
}) {
  // JSON-LD structured data for SEO
  const appUrl = envConfigs.app_url || 'https://afterglow.app';
  
  // SoftwareApplication JSON-LD
  const jsonLdSoftware = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Afterglow',
    description:
      'High-security digital asset custody and automated distribution platform. Protect your digital legacy with zero-knowledge encryption, ensuring your loved ones can access your digital assets when they need them most.',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Zero-knowledge encryption',
      'Dead man\'s switch',
      'Automated asset distribution',
      'Beneficiary management',
      'End-to-end encryption',
      'GDPR & CCPA compliant',
    ],
    url: appUrl,
  };

  // FAQPage JSON-LD (if FAQ exists)
  const jsonLdFAQ = page.faq?.items
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: page.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.question || '',
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer || '',
          },
        })),
      }
    : null;

  return (
    <>
      {/* JSON-LD structured data for SEO */}
      <Script
        id="json-ld-software-application"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
      />
      
      {/* FAQPage JSON-LD structured data */}
      {jsonLdFAQ && (
        <Script
          id="json-ld-faq-page"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFAQ) }}
        />
      )}

      {page.hero && <Hero hero={page.hero} />}
      
      {/* Digital Heirloom: How It Works Section */}
      {page['how-it-works'] && <Features features={page['how-it-works']} className="bg-muted" />}
      
      {/* Digital Heirloom: Zero-Knowledge Security Section */}
      {page['zero-knowledge-security'] && (
        <ZeroKnowledgeSecurity features={page['zero-knowledge-security']} />
      )}
      
      {/* Digital Heirloom: Technical Architecture Section */}
      {page['technical-architecture'] && (
        <Features features={page['technical-architecture']} className="bg-muted" />
      )}
      
      {page.faq && <FAQ faq={page.faq} />}
      {page.cta && <CTA cta={page.cta} className="bg-muted" />}
    </>
  );
}
