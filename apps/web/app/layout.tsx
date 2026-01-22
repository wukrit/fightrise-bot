import type { Metadata } from 'next';

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
      <body>{children}</body>
    </html>
  );
}
