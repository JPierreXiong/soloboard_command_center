/**
 * API: Get All Sites with Metrics
 * 获取用户所有站点及其实时指标
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Fetch sites from database
    // const sites = await db.query.monitoredSites.findMany({
    //   where: (sites, { eq }) => eq(sites.userId, user.id),
    // });

    // Mock data for now - matches the dashboard display
    const mockSites = [
      {
        id: '1',
        name: 'Example Shop',
        domain: 'example-shop.com',
        status: 'offline',
        todayRevenue: 0,
        todayVisitors: 0,
        avgRevenue7d: 450,
        platforms: ['stripe', 'ga4'],
      },
      {
        id: '2',
        name: 'My SaaS',
        domain: 'my-saas.com',
        status: 'warning',
        todayRevenue: 0,
        todayVisitors: 234,
        avgRevenue7d: 890,
        platforms: ['stripe'],
      },
      {
        id: '3',
        name: 'Blog Site',
        domain: 'blog-site.com',
        status: 'online',
        todayRevenue: 156,
        todayVisitors: 1203,
        avgRevenue7d: 120,
        platforms: ['ga4'],
      },
    ];

    // Calculate summary
    const summary = {
      totalSites: mockSites.length,
      totalRevenue: mockSites.reduce((sum, site) => sum + site.todayRevenue, 0),
      totalVisitors: mockSites.reduce((sum, site) => sum + site.todayVisitors, 0),
      sitesOnline: mockSites.filter(site => site.status === 'online').length,
    };

    return NextResponse.json({
      sites: mockSites,
      summary,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    );
  }
}

