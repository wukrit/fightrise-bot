import type { Metadata } from 'next';
import { SessionProvider } from '@/components/auth';

export const metadata: Metadata = {
  title: 'FightRise - Tournament Management',
  description: 'Run Start.gg tournaments through Discord',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
