import type {Metadata} from 'next';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { SplashScreen } from '../components/SplashScreen';

export const metadata: Metadata = {
  title: 'SUPERCOB - Gestão de Cobranças',
  description: 'Sistema profissional para gestão e automação de cobranças',
  applicationName: 'SUPERCOB',
  manifest: '/manifest.webmanifest',
  themeColor: '#0f172a',
  appleWebApp: {
    capable: true,
    title: 'SUPERCOB',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <SessionProvider>
          <SplashScreen />
          {children}
          <Toaster position="top-right" richColors />
        </SessionProvider>
      </body>
    </html>
  );
}
