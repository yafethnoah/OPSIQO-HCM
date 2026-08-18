'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/http/client';
import { OrganizationSwitcher } from './organization-switcher';

type Item = {
  label: string;
  href: string;
  permission?: string;
  platformOnly?: boolean;
  icon: string;
  keywords?: string[];
  area: 'home' | 'people' | 'work' | 'insights' | 'more' | 'admin';
  priority: number;
};

type Group = { label: string; area: Item['area']; items: Item[] };

const allItems: Item[] = [
  { label:'Home',href:'/home',permission:'self.read',icon:'⌂',keywords:['my opsiqo','employee home','start'],area:'home',priority:100 },
  { label:'HR Overview',href:'/dashboard',permission:'commandcenter.read',icon:'⌘',keywords:['command center','dashboard'],area:'home',priority:95 },
  { label:'Notifications',href:'/notifications',permission:'notifications.read',icon:'◉',keywords:['alerts','reminders'],area:'home',priority:90 },

  { label:'My HR',href:'/self-service',permission:'self.read',icon:'◎',keywords:['profile','documents','employee service'],area:'people',priority:100 },
  { label:'Employee Portal',href:'/employee',permission:'self.read',icon:'◈',keywords:['employee services','leave','documents','requests'],area:'people',priority:98 },
  { label:'People',href:'/people',permission:'people.read.directory',icon:'◌',keywords:['employee directory','workers'],area:'people',priority:95 },
  { label:'My Team',href:'/manager',permission:'team.read',icon:'△',keywords:['manager','approvals','direct reports'],area:'people',priority:90 },
  { label:'Organization',href:'/organization',permission:'positions.read',icon:'◇',keywords:['org chart','positions'],area:'people',priority:80 },

  { label:'Recruiting',href:'/recruiting',permission:'recruiting.read',icon:'⌕',keywords:['ats','candidates','jobs'],area:'work',priority:100 },
  { label:'Onboarding',href:'/onboarding',permission:'onboarding.read',icon:'＋',keywords:['new hire'],area:'work',priority:95 },
  { label:'Time & Leave',href:'/time',permission:'time.read',icon:'◷',keywords:['vacation','absence','timesheet'],area:'work',priority:95 },
  { label:'Performance',href:'/performance',permission:'performance.read',icon:'◆',keywords:['goals','reviews'],area:'work',priority:90 },
  { label:'Learning',href:'/learning',permission:'learning.read',icon:'△',keywords:['skills','training','certificates'],area:'work',priority:85 },
  { label:'Compensation',href:'/compensation',permission:'compensation.read',icon:'$',keywords:['pay','salary','rewards'],area:'work',priority:80 },
  { label:'Workflows',href:'/workflows',permission:'workflow.read',icon:'⌁',keywords:['process','approval'],area:'work',priority:75 },

  { label:'People Analytics',href:'/people-analytics',permission:'peopleanalytics.read',icon:'▥',keywords:['analytics','reports','metrics'],area:'insights',priority:100 },
  { label:'Workforce Intelligence',href:'/workforce-intelligence',permission:'peopleanalytics.read',icon:'◈',keywords:['workforce insight'],area:'insights',priority:90 },
  { label:'Workforce Planning',href:'/workforce-planning',permission:'workforce.read',icon:'▦',keywords:['headcount','planning'],area:'insights',priority:85 },
  { label:'Operations Cockpit',href:'/operations-cockpit',permission:'commandcenter.read',icon:'◫',keywords:['operations','status'],area:'insights',priority:80 },
  { label:'Operations Orchestrator',href:'/operations-orchestrator',permission:'workflow.read',icon:'⇢',keywords:['orchestration','automation'],area:'insights',priority:75 },

  { label:'Career & Succession',href:'/career',permission:'career.read',icon:'↗',keywords:['succession','career'],area:'more',priority:90 },
  { label:'Offboarding',href:'/separations',permission:'separation.read',icon:'↙',keywords:['termination','separation'],area:'more',priority:85 },
  { label:'Compliance',href:'/compliance',permission:'compliance.read',icon:'✓',keywords:['policy','acknowledgement'],area:'more',priority:85 },
  { label:'Evidence Center',href:'/evidence-center',permission:'compliance.read',icon:'▣',keywords:['evidence','audit evidence'],area:'more',priority:80 },
  { label:'Employee Relations',href:'/employee-relations',permission:'er.intake',icon:'≋',keywords:['relations','case'],area:'more',priority:80 },
  { label:'Health & Safety',href:'/safety',permission:'safety.report',icon:'✚',keywords:['incident','safety'],area:'more',priority:80 },
  { label:'Experience & HR Help',href:'/experience',permission:'experience.read',icon:'♡',keywords:['help','service request'],area:'more',priority:75 },
  { label:'Lifecycle',href:'/lifecycle',permission:'team.read',icon:'↻',keywords:['employee lifecycle'],area:'more',priority:70 },
  { label:'HR Diagnostic',href:'/hr-diagnostic',permission:'diagnostic.read',icon:'◈',keywords:['diagnostic','assessment'],area:'more',priority:65 },
  { label:'Governance Center',href:'/governance',permission:'governance.read',icon:'⬡',keywords:['governance'],area:'more',priority:60 },
  { label:'Policy & Regulatory',href:'/regulatory',permission:'regulatory.read',icon:'§',keywords:['regulation','policy'],area:'more',priority:60 },
  { label:'Audit & Assurance',href:'/assurance',permission:'assurance.read',icon:'✓',keywords:['assurance','audit'],area:'more',priority:60 },
  { label:'Privacy & AI Assurance',href:'/privacy',permission:'privacy.read',icon:'◐',keywords:['privacy','ai assurance'],area:'more',priority:60 },
  { label:'Workforce Resilience',href:'/resilience',permission:'resilience.read',icon:'∞',keywords:['resilience'],area:'more',priority:55 },
  { label:'Human Capital Strategy',href:'/strategy',permission:'strategy.read',icon:'◎',keywords:['strategy'],area:'more',priority:55 },
  { label:'Org Design',href:'/org-design',permission:'orgdesign.read',icon:'⌘',keywords:['organization design'],area:'more',priority:55 },

  { label:'Organizations',href:'/platform/organizations',platformOnly:true,icon:'▦',keywords:['tenants','new organization','platform administration'],area:'admin',priority:110 },
  { label:'Settings',href:'/settings',icon:'⚙',keywords:['preferences','profile settings'],area:'admin',priority:100 },
  { label:'Import Center',href:'/import-center',permission:'documents.manage',icon:'⇩',keywords:['import','bulk upload','migration'],area:'admin',priority:95 },
  { label:'Automation',href:'/automation',permission:'automation.read',icon:'⚙',keywords:['automation','jobs'],area:'admin',priority:90 },
  { label:'AI HR Copilot',href:'/ai-copilot',permission:'ai.use',icon:'✦',keywords:['ai','copilot'],area:'admin',priority:90 },
  { label:'Integrations',href:'/integrations',permission:'integration.read',icon:'⛓',keywords:['integration','connector'],area:'admin',priority:80 },
  { label:'Identity & SSO',href:'/identity',permission:'identity.read',icon:'◇',keywords:['identity','sso'],area:'admin',priority:75 },
  { label:'Security Operations',href:'/security-operations',permission:'securityops.read',icon:'⬢',keywords:['security operations'],area:'admin',priority:75 },
  { label:'Security Admin',href:'/security',permission:'security.manage',icon:'▣',keywords:['security admin'],area:'admin',priority:70 },
  { label:'Platform Reliability',href:'/platform-reliability',permission:'platform.read',icon:'◉',keywords:['reliability','health'],area:'admin',priority:70 },
  { label:'Audit Trail',href:'/audit',permission:'audit.read',icon:'▤',keywords:['audit trail','history'],area:'admin',priority:70 },
  { label:'Members',href:'/members',permission:'membership.read',icon:'◫',keywords:['members','access'],area:'admin',priority:65 },
];

const groupDefinitions: Array<{ area: Item['area']; label: string; defaultClosed?: boolean }> = [
  { area:'home', label:'Start' },
  { area:'people', label:'People' },
  { area:'work', label:'Talent & Work' },
  { area:'insights', label:'Insights' },
  { area:'more', label:'More', defaultClosed:true },
  { area:'admin', label:'Admin & Platform', defaultClosed:true },
];

function canSee(item: Item, permissions: string[] | null, platformAdmin: boolean): boolean {
  if (item.platformOnly && !platformAdmin) return false;
  if (permissions === null) return ['/home','/dashboard','/self-service'].includes(item.href);
  return !item.permission || permissions.includes(item.permission);
}

function searchableText(item: Item): string {
  return [item.label,item.href,...(item.keywords ?? [])].join(' ').toLowerCase();
}

export function Nav() {
  const pathname = usePathname();
  const [permissions,setPermissions] = useState<string[]|null>(null);
  const [platformAdmin,setPlatformAdmin] = useState(false);
  const [collapsed,setCollapsed] = useState(false);
  const [query,setQuery] = useState('');
  const [closedGroups,setClosedGroups] = useState<Record<string,boolean>>(
    Object.fromEntries(groupDefinitions.filter(g=>g.defaultClosed).map(g=>[g.label,true])),
  );

  useEffect(()=>{
    let alive = true;
    apiFetch<{actor:{permissions:string[]}}>('/api/me')
      .then(r=>{ if(alive) setPermissions(r.actor.permissions); })
      .catch(()=>{ if(alive) setPermissions([]); });
    apiFetch<{data:{allowed:boolean}}>('/api/platform/access', { orgContext:'omit' })
      .then(r=>{ if(alive) setPlatformAdmin(r.data.allowed === true); })
      .catch(()=>{ if(alive) setPlatformAdmin(false); });
    return ()=>{ alive = false; };
  },[]);

  const visibleItems = useMemo(
    ()=>allItems.filter(item=>canSee(item,permissions,platformAdmin)),
    [permissions,platformAdmin],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = useMemo(
    ()=>normalizedQuery
      ? visibleItems.filter(item=>searchableText(item).includes(normalizedQuery)).sort((a,b)=>b.priority-a.priority)
      : [],
    [normalizedQuery,visibleItems],
  );

  const visibleGroups: Group[] = useMemo(
    ()=>groupDefinitions
      .map(group=>({
        label:group.label,
        area:group.area,
        items:visibleItems.filter(item=>item.area===group.area).sort((a,b)=>b.priority-a.priority),
      }))
      .filter(group=>group.items.length>0),
    [visibleItems],
  );

  const renderItem = (item: Item) => {
    const active = pathname===item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`navItem ${active?'active':''}`}
        title={collapsed?item.label:undefined}
        aria-current={active?'page':undefined}
        onClick={()=>setQuery('')}
      >
        <span className="navIcon" aria-hidden="true">{item.icon}</span>
        <span className="navText">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className={`sidebar ${collapsed?'collapsed':''}`} aria-label="Application navigation">
      <div className="sidebarTop">
        <Link href="/home" className="brand" aria-label="OPSIQO home">
          <img className="brandLogo" src="/brand/opsiqo-wordmark.png" alt="OPSIQO" />
          <img className="brandIcon" src="/brand/opsiqo-icon.png" alt="" aria-hidden="true" />
        </Link>
        <OrganizationSwitcher/>
      </div>

      {!collapsed && (
        <div className="navFinder">
          <label className="navFinderLabel" htmlFor="opsiqo-nav-search">Find</label>
          <input
            id="opsiqo-nav-search"
            className="navFinderInput"
            type="search"
            value={query}
            onChange={event=>setQuery(event.target.value)}
            placeholder="Page, task or module…"
            autoComplete="off"
          />
          {normalizedQuery && (
            <div className="navSearchSummary" role="status">
              {searchResults.length ? `${searchResults.length} result${searchResults.length===1?'':'s'}` : 'No matching page'}
            </div>
          )}
        </div>
      )}

      <nav className="navScroll" aria-label="Primary">
        {normalizedQuery ? (
          <section className="navGroup navSearchResults">
            <div className="navGroupStaticLabel">Search results</div>
            <div className="navGroupItems">
              {searchResults.map(renderItem)}
              {!searchResults.length && (
                <div className="navEmptyState">Try “leave”, “people”, “recruiting”, “analytics” or “settings”.</div>
              )}
            </div>
          </section>
        ) : (
          visibleGroups.map(group=>{
            const closed = closedGroups[group.label]===true;
            return (
              <section className={`navGroup ${closed?'closed':''}`} key={group.label}>
                <button
                  type="button"
                  className="navGroupLabel"
                  aria-expanded={!closed}
                  onClick={()=>setClosedGroups(value=>({...value,[group.label]:!value[group.label]}))}
                >
                  <span>{group.label}</span>
                  <span className="navGroupChevron" aria-hidden="true">{closed?'›':'⌄'}</span>
                </button>
                <div className="navGroupItems">{group.items.map(renderItem)}</div>
              </section>
            );
          })
        )}
      </nav>

      <div className="sidebarFooter">
        <div className="phaseBadge"><span>Enterprise HCM</span><strong>v8.5</strong></div>
        <button
          className="navCollapse"
          type="button"
          onClick={()=>setCollapsed(value=>!value)}
          aria-label={collapsed?'Expand navigation':'Collapse navigation'}
        >
          {collapsed?'»':'«'}<span>{collapsed?'':'Collapse'}</span>
        </button>
      </div>
    </aside>
  );
}
