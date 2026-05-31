import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateNonce, buildCsp } from '@/lib/csp';

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'https://portfolio-tracker-rho-flame.vercel.app',
  'http://localhost:3000',
].filter(Boolean);

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    /\.(jpg|jpeg|png|gif|ico|svg|webp|txt|json|xml|css|js|map)$/i.test(pathname)
  );
}

function handleCors(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return null;

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isStaticAsset(pathname)) return NextResponse.next();

  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  const nonce = generateNonce();
  const response = NextResponse.next();

  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|public).*)',
};
