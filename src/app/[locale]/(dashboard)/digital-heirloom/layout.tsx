/**
 * Digital Heirloom Layout
 * 包含侧边栏导航和主内容区域
 */

import { ReactNode } from 'react';
import { DashboardLayout } from '@/shared/blocks/dashboard';
import type { Sidebar } from '@/shared/types/blocks/dashboard';

const sidebar: Sidebar = {
  header: {
    brand: {
      title: 'Afterglow',
      logo: {
        src: '/logo.png',
        alt: 'Afterglow Logo',
      },
    },
  },
  main_navs: [
    {
      title: 'Navigation',
      items: [
        {
          title: 'Dashboard',
          url: '/digital-heirloom/dashboard',
          icon: 'Heart', // Lucide icon name (string)
        },
        {
          title: 'Vault',
          url: '/digital-heirloom/vault',
          icon: 'Lock',
        },
        {
          title: 'Beneficiaries',
          url: '/digital-heirloom/beneficiaries',
          icon: 'Users',
        },
        {
          title: 'Check-in',
          url: '/digital-heirloom/check-in',
          icon: 'Clock',
        },
        {
          title: 'Settings',
          url: '/digital-heirloom/settings',
          icon: 'Settings',
        },
      ],
    },
  ],
  user: {
    show_email: true,
    show_signout: true,
  },
};

export default function DigitalHeirloomLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardLayout sidebar={sidebar}>{children}</DashboardLayout>;
}

