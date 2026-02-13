/**
 * Data Aggregation Service
 * 聚合所有平台的数据
 */

import { checkUptime } from './uptime-service';

interface SiteConfig {
  id: string;
  domain: string;
  platforms: {
    stripe?: { apiKey: string };
    shopify?: { apiKey: string; shopDomain: string };
    ga4?: { propertyId: string; credentials: any };
  };
}

interface AggregatedMetrics {
  revenue: {
    today: number;
    sources: Record<string, number>;
  };
  visitors: {
    today: number;
    sources: Record<string, number>;
  };
  uptime: {
    status: 'up' | 'down';
    responseTime: number;
  };
}

export async function aggregateSiteData(
  config: SiteConfig
): Promise<AggregatedMetrics> {
  // Run all checks concurrently
  const [uptimeResult, revenueData, visitorData] = await Promise.all([
    checkUptime(config.domain),
    fetchRevenueData(config),
    fetchVisitorData(config),
  ]);

  return {
    revenue: revenueData,
    visitors: visitorData,
    uptime: {
      status: uptimeResult.status,
      responseTime: uptimeResult.responseTime,
    },
  };
}

async function fetchRevenueData(config: SiteConfig) {
  const sources: Record<string, number> = {};
  let total = 0;

  // Fetch from Stripe
  if (config.platforms.stripe) {
    try {
      // TODO: Implement Stripe API call
      const stripeRevenue = 0; // await fetchStripeRevenue(config.platforms.stripe.apiKey);
      sources.stripe = stripeRevenue;
      total += stripeRevenue;
    } catch (error) {
      console.error('Stripe fetch error:', error);
      sources.stripe = 0;
    }
  }

  // Fetch from Shopify
  if (config.platforms.shopify) {
    try {
      // TODO: Implement Shopify API call
      const shopifyRevenue = 0; // await fetchShopifyRevenue(config.platforms.shopify);
      sources.shopify = shopifyRevenue;
      total += shopifyRevenue;
    } catch (error) {
      console.error('Shopify fetch error:', error);
      sources.shopify = 0;
    }
  }

  return {
    today: total,
    sources,
  };
}

async function fetchVisitorData(config: SiteConfig) {
  const sources: Record<string, number> = {};
  let total = 0;

  // Fetch from GA4
  if (config.platforms.ga4) {
    try {
      // TODO: Implement GA4 API call
      const ga4Visitors = 0; // await fetchGA4Visitors(config.platforms.ga4);
      sources.ga4 = ga4Visitors;
      total += ga4Visitors;
    } catch (error) {
      console.error('GA4 fetch error:', error);
      sources.ga4 = 0;
    }
  }

  return {
    today: total,
    sources,
  };
}

/**
 * Aggregate data for multiple sites
 */
export async function aggregateMultipleSites(
  configs: SiteConfig[]
): Promise<Map<string, AggregatedMetrics>> {
  const results = await Promise.all(
    configs.map(async (config) => {
      const metrics = await aggregateSiteData(config);
      return [config.id, metrics] as [string, AggregatedMetrics];
    })
  );

  return new Map(results);
}

