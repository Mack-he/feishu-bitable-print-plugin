/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除静态导出，启用 API routes
  // output: 'export',

  // 禁用图片优化
  images: {
    unoptimized: true,
  },

  // 启用严格模式
  reactStrictMode: true,

  // 环境变量
  env: {
    APP_NAME: '飞书多维表格排版打印插件',
    APP_VERSION: '2.0.0',
  },

  // 压缩
  compress: true,

  // 实验性功能
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Trailing slash
  trailingSlash: true,

  // Turbopack 配置（Next.js 16 默认使用）
  turbopack: {},
};

export default nextConfig;
