'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Nav } from '@/components/nav';

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
      <a className="skipLink" href="#main-content">Skip to main content</a>
      <Nav />
      <main id="main-content" className="main" tabIndex={-1}>
        <div className="mainInner">{children}</div>
      </main>
    </div>
  );
}
