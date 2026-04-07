import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: false },
  serverExternalPackages: ['yahoo-finance2'],
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
};

export default withSentryConfig(nextConfig, sentryConfig);
