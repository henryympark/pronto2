import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ConditionalWrapper } from '@/components/layout/ConditionalWrapper';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Pronto - 스튜디오 예약 서비스',
  description: '스튜디오 예약을 더 쉽고 빠르게',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}
      >
        <Providers>
          <ConditionalWrapper>
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </ConditionalWrapper>
        </Providers>
      </body>
    </html>
  );
}
