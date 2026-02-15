import type { Metadata, Viewport } from 'next';
import { SessionProvider } from '@/components/auth';
import MobileLayout from './mobile-layout';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#5865F2',
};

export const metadata: Metadata = {
  title: 'FightRise - Tournament Management',
  description: 'Run Start.gg tournaments through Discord',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FightRise',
  },
  category: 'games',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        <SessionProvider>
          <MobileLayout>{children}</MobileLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
