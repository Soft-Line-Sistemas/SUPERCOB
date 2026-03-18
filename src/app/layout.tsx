import type {Metadata} from 'next';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { SplashScreen } from '../components/SplashScreen';

export const metadata: Metadata = {
  title: 'SUPERCOB - Gestão de Cobranças',
  description: 'Sistema profissional para gestão e automação de cobranças',
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
