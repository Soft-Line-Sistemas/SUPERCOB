import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { SplashScreen } from '../components/SplashScreen';

export const metadata: Metadata = {
  title: 'Mister Cobrança - Gestão Inteligente',
  description: 'Sistema profissional para gestão e automação de cobranças',
  applicationName: 'Mister Cobrança',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Mister Cobrança',
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

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme')||'system';var m=window.matchMedia('(prefers-color-scheme: dark)');var d=t==='dark'||(t==='system'&&m.matches);document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',d);}catch(e){}})();",
          }}
        />
        <SessionProvider>
          <SplashScreen />
          {children}
          <Toaster position="bottom-center" richColors />
        </SessionProvider>
      </body>
    </html>
  );
}
