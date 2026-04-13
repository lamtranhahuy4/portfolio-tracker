import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Get the list of allowed origins from environment or use defaults
const getAllowedOrigins = (): string[] => {
  const prodUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portfolio-tracker-rho-flame.vercel.app';
  const devUrl = 'http://localhost:3000';
  const stagingUrl = process.env.STAGING_URL || '';

  return [
    prodUrl,
    devUrl,
    ...(stagingUrl ? [stagingUrl] : []),
  ].filter(Boolean);
};

// In-memory rate limit store for middleware
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Get the client IP address from the request
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

/**
 * Check rate limit for a given key
 */
function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Create new window
    entry = { count: 1, resetTime: now + windowMs };
    rateLimitStore.set(key, entry);
    return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: maxRequests - entry.count, retryAfter: 0 };
}

/**
 * Extract rate limit config from URL path
 */
function getRateLimitConfig(pathname: string): { maxRequests: number; windowMs: number } {
  // Stricter limits for sensitive endpoints
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/admin')) {
    return { maxRequests: 10, windowMs: 60000 }; // 10 req/min
  }

  // Moderate limits for market data endpoints
  if (pathname.startsWith('/api/quotes') || pathname.startsWith('/api/price')) {
    return { maxRequests: 60, windowMs: 60000 }; // 60 req/min
  }

  // Default limits for other API endpoints
  if (pathname.startsWith('/api/')) {
    return { maxRequests: 100, windowMs: 60000 }; // 100 req/min
  }

  // No rate limiting for static content
  return { maxRequests: Infinity, windowMs: 60000 };
}

/**
 * Generate Content-Security-Policy header
 */
function getCSPHeader(): string {
  const allowedOrigins = getAllowedOrigins();
  const originsList = allowedOrigins.join(' ');

  // Strict CSP for production, more permissive for dev
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return [
      // Restricting script sources
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdn.vercel-insights.com",
      // Restricting style sources
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Restricting font sources
      "font-src 'self' https://fonts.gstatic.com data:",
      // Restricting image sources
      "img-src 'self' data: https: http:",
      // Restricting connect sources (AJAX, WebSocket, etc)
      "connect-src 'self' https: http: ws: wss:",
      // Frame ancestors
      "frame-ancestors 'none'",
      // Base URI
      "base-uri 'self'",
      // Form action
      "form-action 'self'",
      // Default fallback
      "default-src 'self'",
    ].join('; ');
  }

  // Production CSP - more restrictive
  return [
    "script-src 'self' https://cdn.vercel-insights.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https:",
    `connect-src 'self' https://*.neon.tech https://*.vercel.app ${originsList}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "default-src 'self'",
  ].join('; ');
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  // Strict-Transport-Security
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  // Content-Security-Policy
  response.headers.set('Content-Security-Policy', getCSPHeader());

  // X-Content-Type-Options - Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options - Clickjacking protection
  response.headers.set('X-Frame-Options', 'DENY');

  // X-XSS-Protection - Legacy XSS protection for older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy - Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy - Controls browser features
  response.headers.set(
    'Permissions-Policy',
    [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', ')
  );

  // DNS Prefetch Control
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  return response;
}

/**
 * Handle CORS for API routes
 */
function handleCORS(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    if (isAllowedOrigin) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }
    return new NextResponse(null, { status: 403 });
  }

  return null;
}

/**
 * Main middleware function
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets and public files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.match(/\.(jpg|jpeg|png|gif|ico|svg|webp|txt|json|xml|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // For API routes, check rate limiting and CORS
  if (pathname.startsWith('/api/')) {
    // Skip rate limiting for health checks
    if (!pathname.includes('/health')) {
      const clientIp = getClientIp(request);
      const { maxRequests, windowMs } = getRateLimitConfig(pathname);
      const rateLimitKey = `${clientIp}:${pathname}`;
      const limit = checkRateLimit(rateLimitKey, maxRequests, windowMs);

      if (!limit.allowed) {
        const response = NextResponse.json(
          { error: 'Too many requests', retryAfter: limit.retryAfter },
          { status: 429 }
        );
        response.headers.set('Retry-After', limit.retryAfter.toString());
        return response;
      }
    }

    // Handle CORS
    const corsResponse = handleCORS(request);
    if (corsResponse) {
      return corsResponse;
    }
  }

  // Get the response (either from next handler or default)
  let response = NextResponse.next();

  // Apply security headers to all responses
  response = applySecurityHeaders(response);

  // Add CORS headers for API responses if applicable
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

// Configure which routes should be handled by the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
