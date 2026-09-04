'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { shellText,useShellLocale } from '@/lib/opsiqo-one/shell-i18n';
const items=[['Home','/home','⌂'],['My Work','/my-work','✓'],['People','/people','◌'],['Intelligence','/intelligence','✦'],['More','/more','•••']] as const;
export function MobileOutcomeNav(){const pathname=usePathname(),locale=useShellLocale();return <nav className="mobileOutcomeNav" data-opsiqo-shell-i18n="true" aria-label={shellText('OPSIQO ONE mobile outcomes',locale)}>{items.map(([label,href,icon])=>{const active=pathname===href||pathname.startsWith(`${href}/`);return <Link key={href} href={href} className={active?'active':''} aria-current={active?'page':undefined}><span aria-hidden="true">{icon}</span><strong>{shellText(label,locale)}</strong></Link>})}</nav>}
