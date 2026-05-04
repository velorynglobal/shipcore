import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono, Syne } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import Providers from '@/components/layout/Providers';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import './globals.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | ShipCore ERP',
    default:  'ShipCore ERP — Smart Logistics for LCL, CHA & Freight Forwarders',
  },
  description: 'ShipCore is a production-grade logistics ERP for LCL consolidators, freight forwarders, and custom house agents.',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#1D4ED8',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${syne.variable}`}>
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        <Providers>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0A0F1E',
              color:      '#F8FAFC',
              border:     '1px solid #334155',
              borderRadius: '12px',
              fontSize:   '14px',
              fontFamily: 'IBM Plex Sans, sans-serif',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
