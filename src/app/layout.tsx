import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/app-shell';

import { PwaRegistrar } from '@/components/pwa-registrar';
import { AppearanceBootstrap } from '@/components/appearance-bootstrap';
import { LanguageBootstrap } from '@/components/language-bootstrap';
export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  title: { default: 'OPSIQO ONE', template: '%s · OPSIQO ONE' },
  description: 'OPSIQO ONE — Human + AI Operating System for governed HR operations, workforce intelligence and organizational execution.',
  icons: {
    icon: '/brand/opsiqo-icon.png',
    shortcut: '/brand/opsiqo-icon.png',
    apple: '/brand/opsiqo-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaRegistrar />
        <AppearanceBootstrap />
        <LanguageBootstrap />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
