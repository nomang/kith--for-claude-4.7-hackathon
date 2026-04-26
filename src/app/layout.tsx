import type { Metadata } from 'next';
import HeyKithLoader from '@/components/HeyKithLoader';
import DemoTourLoader from '@/components/DemoTourLoader';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kith',
  description: 'A voice companion for people living with Alzheimer\'s',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <HeyKithLoader />
        <DemoTourLoader />
      </body>
    </html>
  );
}
