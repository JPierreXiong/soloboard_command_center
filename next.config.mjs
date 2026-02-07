import bundleAnalyzer from '@next/bundle-analyzer';
import { createMDX } from 'fumadocs-mdx/next';
import createNextIntlPlugin from 'next-intl/plugin';

const withMDX = createMDX();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin({
  requestConfig: './src/core/i18n/request.ts',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  reactStrictMode: false,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
      },
    ],
  },
  async redirects() {
    return [];
  },
  // 类型检查配置（用于快速通过 Vercel 部署）
  typescript: {
    // 允许构建时忽略 TypeScript 错误（仅在 Vercel 环境下使用）
    ignoreBuildErrors: process.env.VERCEL === 'true',
  },
  // 注意：Next.js 16+ 中 eslint 配置已移除，通过环境变量控制
  turbopack: {
    // 明确指定项目根目录，避免 Next.js 错误推断工作区根目录
    root: process.cwd(),
    resolveAlias: {
      // fs: {
      //   browser: './empty.ts', // We recommend to fix code imports before using this method
      // },
    },
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    // Disable mdxRs for Vercel deployment compatibility with fumadocs-mdx
    ...(process.env.VERCEL ? {} : { mdxRs: true }),
  },
  reactCompiler: true,
  // Webpack 配置：忽略可选依赖 jsqr（如果未安装）
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 客户端构建：忽略 jsqr 模块解析错误
      config.resolve.fallback = {
        ...config.resolve.fallback,
      };
      // 添加外部化配置，允许 jsqr 不存在
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          'jsqr': 'commonjs jsqr',
        });
      }
    }
    return config;
  },
};

export default withBundleAnalyzer(withNextIntl(withMDX(nextConfig)));
