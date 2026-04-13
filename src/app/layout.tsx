import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'My Portfolio Oasis',
  description: 'Quản lý tài sản an toàn, thanh thoát và tự động hóa cao',
  applicationName: 'Portfolio Tracker',
  authors: [{ name: 'Portfolio Tracker Team' }],
  keywords: ['portfolio', 'investment', 'tracking', 'finance', 'dashboard'],
  creator: 'Portfolio Tracker',
  publisher: 'Portfolio Tracker',
  robots: {
    index: true,
    follow: true,
    noarchive: false,
    nosnippet: false,
    noimageindex: false,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://portfolio-tracker-rho-flame.vercel.app',
    siteName: 'Portfolio Tracker',
    title: 'My Portfolio Oasis',
    description: 'Quản lý tài sản an toàn, thanh thoát và tự động hóa cao',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://portfolio-tracker-rho-flame.vercel.app'}/hero-banner.jpg`,
        width: 1200,
        height: 630,
        alt: 'Portfolio Tracker',
        type: 'image/jpeg',
      },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Portfolio Tracker',
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Additional security meta tags */}
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
        {/* Referrer policy for privacy */}
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        {/* Theme color for browser chrome */}
        <meta name="theme-color" content="#000000" />
        {/* PWA manifest link */}
        <link rel="manifest" href="/manifest.json" />
        {/* Preconnect to external resources for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS prefetch for external APIs */}
        <link rel="dns-prefetch" href="https://api.example.com" />
        {/* Security.txt link */}
        <link rel="security.txt" href="/.well-known/security.txt" />
      </head>
      <body className={inter.className}>
        <Toaster position="top-right" richColors />
        {children}
      </body>
    </html>
  );
}
