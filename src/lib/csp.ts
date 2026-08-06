export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function buildCsp(nonce: string): string {
  return [
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ""} https://cdn.vercel-insights.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: https:`,
    `connect-src 'self' https://*.neon.tech https://*.vercel.app ${process.env.NEXT_PUBLIC_APP_URL || ''}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `default-src 'self'`,
  ].join('; ');
}

export async function getNonceFromHeaders(): Promise<string> {
  const { headers } = await import('next/headers');
  const hdrs = await headers();
  return hdrs.get('x-nonce') ?? generateNonce();
}
