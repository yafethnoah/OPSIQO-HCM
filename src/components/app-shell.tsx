'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Nav } from '@/components/nav';
import { OpsiQoCommandBar } from '@/components/opsiqo-command-bar';
import { ConnectivityBanner } from '@/components/connectivity-banner';
import { MobileOutcomeNav } from '@/components/mobile-outcome-nav';
import { RouteAnnouncer } from '@/components/route-announcer';
import { useGlobalReviewedTranslation } from '@/lib/opsiqo-one/legacy-surface-i18n';

const PUBLIC_BOOTSTRAP_ROUTES = new Set([
  '/signin',
  '/register',
  '/forgot-password',
  '/accept-invite',
  '/setup',
  '/mfa/setup',
]);

function isPublicBootstrapRoute(pathname: string): boolean {
  for (const route of PUBLIC_BOOTSTRAP_ROUTES) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return true;
  }
  return false;
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  useGlobalReviewedTranslation();
  const pathname = usePathname();
  const publicBootstrap = isPublicBootstrapRoute(pathname);

  if (publicBootstrap) {
    return (
      <>
        <a className="skipLink" href="#main-content">Skip to main content</a>
        <main id="main-content" className="main authMain" data-opsiqo-shell="public-auth" tabIndex={-1}>
          <div className="mainInner authMainInner">{children}</div>
        </main>
      </>
    );
  }

  return (
    <div className="shell" data-opsiqo-shell="authenticated">
      <RouteAnnouncer />
      <a className="skipLink" href="#main-content">Skip to main content</a>
      <Nav />
      <main id="main-content" className="main" tabIndex={-1}>
        <ConnectivityBanner />
        <OpsiQoCommandBar />
        <div className="mainInner">{children}</div>
      </main>
      <MobileOutcomeNav />
    </div>
  );
}
