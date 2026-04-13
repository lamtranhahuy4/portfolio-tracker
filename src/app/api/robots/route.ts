import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Robots.txt endpoint
 * Follows standard robots.txt protocol
 * Rate limiting is applied at middleware level
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portfolio-tracker-rho-flame.vercel.app';

  const robotsTxt = `# robots.txt for Portfolio Tracker
# Generated dynamically for security and SEO compliance

# Allow all user agents to crawl the site
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /.well-known/
Disallow: /.env*
Disallow: /private/
Disallow: /reset-password/
Disallow: /forgot-password/

# Specific search engines
User-agent: Bingbot
Allow: /

User-agent: Googlebot
Allow: /

# Crawl delay for polite bots (in seconds)
Crawl-delay: 1

# Sitemaps
Sitemap: ${appUrl}/api/sitemap

# Security notes
# API endpoints are not indexed for privacy and security
# Admin pages are restricted from crawling
`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
