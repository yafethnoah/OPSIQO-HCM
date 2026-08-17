import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/app-shell';

import { PwaRegistrar } from '@/components/pwa-registrar';
import { AppearanceBootstrap } from '@/components/appearance-bootstrap';
export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  title: { default: 'OPSIQO HCM', template: '%s · OPSIQO HCM' },
  description: 'Enterprise human-capital command, governance, workforce intelligence and HR operations platform.',
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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
