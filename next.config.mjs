import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: false },
  serverExternalPackages: ['yahoo-finance2'],
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: false, // Enable image optimization in production
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Headers and redirects
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // Compression and optimization
  compress: true,
  productionBrowserSourceMaps: false, // Disable source maps in production for security
  swcMinify: true,

  // Performance monitoring
  experimental: {
    optimizePackageImports: ['recharts', 'sonner', 'lucide-react'],
  },

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@std/testing/mock": false,
      "@std/testing/bdd": false,
      "@gadicc/fetch-mock-cache/runtimes/deno.ts": false,
      "@gadicc/fetch-mock-cache/stores/fs.ts": false,
    };
    return config;
  },
};

const sentryConfig = {
  silent: true,
  tunnelRoute: '/monitoring',
};

export default withSentryConfig(nextConfig, sentryConfig);
