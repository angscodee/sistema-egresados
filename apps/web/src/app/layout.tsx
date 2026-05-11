import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { APP_NAME } from '@egresados/shared';
import { SonnerToaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth-context';
import { TRPCProvider } from '@/lib/trpc/Provider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Plataforma institucional para egresados y oferta laboral.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <TRPCProvider>
            {children}
            <SonnerToaster />
          </TRPCProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
