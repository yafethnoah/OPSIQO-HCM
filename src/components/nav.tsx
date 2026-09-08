'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/http/client';
import { OrganizationSwitcher } from './organization-switcher';
import { rankNavigationItems } from '@/lib/opsiqo-one/navigation-intelligence';
import { readAdaptiveNavigation, recordNavigationVisit, suggestedNavigationHrefs, toggleNavigationPin } from '@/lib/preferences/adaptive-navigation';
import { shellText,useShellLocale } from '@/lib/opsiqo-one/shell-i18n';

type Item = {
  label: string;
  href: string;
  permission?: string;
  icon: string;
  keywords?: string[];
  area: 'home' | 'people' | 'work' | 'insights' | 'more' | 'admin';
  priority: number;
  roles?: string[];
};

type Group = { label: string; area: Item['area']; items: Item[] };

const allItems: Item[] = [
  { label:'Home',href:'/home',permission:'self.read',icon:'âŒ‚',keywords:['my opsiqo','employee home','start'],area:'home',priority:100 },
  { label:'My Work',href:'/my-work',permission:'self.read',icon:'âœ“',keywords:['tasks','approvals','queue','attention'],area:'home',priority:99 },
  { label:'HR Overview',href:'/dashboard',permission:'commandcenter.read',icon:'âŒ˜',keywords:['command center','dashboard'],area:'home',priority:95 },
  { label:'Notifications',href:'/notifications',permission:'notifications.read',icon:'â—‰',keywords:['alerts','reminders'],area:'home',priority:90 },
  { label:'Daily Brief',href:'/daily-brief',permission:'self.read',icon:'â˜€',keywords:['daily brief','morning brief','today','summary'],area:'home',priority:96 },

  { label:'My HR',href:'/self-service',permission:'self.read',icon:'â—Ž',keywords:['profile','documents','employee service'],area:'people',priority:100 },
  { label:'Employee Concierge',href:'/concierge',permission:'self.read',icon:'âœ¦',keywords:['employee concierge','ask hr','employee ai'],area:'people',priority:99 },
  { label:'Manager Copilot',href:'/manager-copilot',permission:'team.read',icon:'âœ¦',keywords:['manager copilot','one on one','team priorities'],area:'people',priority:97 },
  { label:'Employee Portal',href:'/employee',permission:'self.read',icon:'â—ˆ',keywords:['employee services','leave','documents','requests'],area:'people',priority:98 },
  { label:'People',href:'/people',permission:'people.read.directory',icon:'â—Œ',keywords:['employee directory','workers'],area:'people',priority:95 },
  { label:'My Team',href:'/manager',permission:'team.read',icon:'â–³',keywords:['manager','approvals','direct reports'],area:'people',priority:90 },
  { label:'Organization',href:'/organization',permission:'positions.read',icon:'â—‡',keywords:['org chart','positions'],area:'people',priority:80 },
  { label:'Unified Workforce',href:'/workforce-registry',permission:'workforce.read',icon:'â—Ž',keywords:['workforce registry','contractors','volunteers','digital agents','entire workforce'],area:'people',priority:79 },

  { label:'Recruiting',href:'/recruiting',permission:'recruiting.read',icon:'âŒ•',keywords:['ats','candidates','jobs'],area:'work',priority:100 },
  { label:'Onboarding',href:'/onboarding',permission:'onboarding.read',icon:'ï¼‹',keywords:['new hire'],area:'work',priority:95 },
  { label:'Offboarding',href:'/separations',permission:'separation.read',icon:'â†™',keywords:['offboarding','employee exit','termination','separation'],area:'work',priority:94 },
  { label:'Time & Leave',href:'/time',permission:'time.read',icon:'â—·',keywords:['vacation','absence','timesheet'],area:'work',priority:95 },
  { label:'Performance',href:'/performance',permission:'performance.read',icon:'â—†',keywords:['goals','reviews'],area:'work',priority:90 },
  { label:'Learning',href:'/learning',permission:'learning.read',icon:'â–³',keywords:['skills','training','certificates'],area:'work',priority:85 },
  { label:'Skills Passport',href:'/skills-passport',permission:'learning.read',icon:'â—‡',keywords:['verified skills','skill passport'],area:'work',priority:84 },
  { label:'Career GPS',href:'/career-gps',permission:'career.read',icon:'â†—',keywords:['career path','target role','development'],area:'work',priority:83 },
  { label:'Talent Marketplace',href:'/talent-marketplace',permission:'career.read',icon:'â—Ž',keywords:['internal mobility','internal jobs','opportunities'],area:'work',priority:82 },
  { label:'Compensation',href:'/compensation',permission:'compensation.read',icon:'$',keywords:['pay','salary','rewards'],area:'work',priority:80 },
  { label:'Benefits',href:'/benefits',permission:'compensation.read',icon:'B',keywords:['benefits','enrollment','coverage'],area:'work',priority:79 },
  { label:'Payroll',href:'/payroll',permission:'payroll.export',icon:'P',keywords:['payroll','cpp','ei','qpp','qpip'],area:'work',priority:78 },
  { label:'E-Signatures',href:'/esign',permission:'documents.manage',icon:'S',keywords:['signature','esign','agreement'],area:'work',priority:77 },
  { label:'Workflows',href:'/workflows',permission:'workflow.read',icon:'âŒ',keywords:['process','approval'],area:'work',priority:75 },

  { label:'Intelligence',href:'/intelligence',permission:'self.read',icon:'âœ¦',keywords:['cortex','knowledge graph','ai','intelligence'],area:'insights',priority:105 },
  { label:'People Analytics',href:'/people-analytics',permission:'peopleanalytics.read',icon:'â–¥',keywords:['analytics','reports','metrics'],area:'insights',priority:100 },
  { label:'Workforce Intelligence',href:'/workforce-intelligence',permission:'peopleanalytics.read',icon:'â—ˆ',keywords:['workforce insight'],area:'insights',priority:90 },
  { label:'Workforce Planning',href:'/workforce-planning',permission:'workforce.read',icon:'â–¦',keywords:['headcount','planning'],area:'insights',priority:85 },
  { label:'Scenario Lab',href:'/scenario-lab',permission:'workforce.read',icon:'â—«',keywords:['what if','simulation','digital twin'],area:'insights',priority:84 },
  { label:'Grant Workforce',href:'/grant-workforce',permission:'workforce.read',icon:'â–§',keywords:['grant workforce','funding','funder','nonprofit','ngo','salary allocation'],area:'insights',priority:83 },
  { label:'Program Workforce',href:'/program-workforce',permission:'workforce.read',icon:'â–¥',keywords:['project grant','program cost','project workforce','program workforce'],area:'work',priority:81 },
  { label:'Program Portfolio',href:'/program-portfolio',permission:'workforce.read',icon:'â–¦',keywords:['program portfolio','budget actual','project budget','financial evidence','grant actual'],area:'insights',priority:84 },
  { label:'Operations Cockpit',href:'/operations-cockpit',permission:'commandcenter.read',icon:'â—«',keywords:['operations','status'],area:'insights',priority:80 },
  { label:'Operations Orchestrator',href:'/operations-orchestrator',permission:'workflow.read',icon:'â‡¢',keywords:['orchestration','automation'],area:'insights',priority:75 },

  { label:'Career & Succession',href:'/career',permission:'career.read',icon:'â†—',keywords:['succession','career'],area:'more',priority:90 },
  { label:'Organizational Memory',href:'/organizational-memory',permission:'policies.read',icon:'â—ˆ',keywords:['organizational memory','internal knowledge','handbook','policy search'],area:'more',priority:91 },
  { label:'Policy Intelligence',href:'/policy-intelligence',permission:'policies.read',icon:'Â§',keywords:['policy intelligence','policy overlap','review due'],area:'more',priority:90 },
  { label:'Compliance Radar',href:'/compliance-radar',permission:'compliance.read',icon:'â—‰',keywords:['compliance radar','expiring','gaps'],area:'more',priority:88 },
  { label:'Compliance',href:'/compliance',permission:'compliance.read',icon:'âœ“',keywords:['policy','acknowledgement'],area:'more',priority:85 },
  { label:'Evidence Center',href:'/evidence-center',permission:'compliance.read',icon:'â–£',keywords:['evidence','audit evidence'],area:'more',priority:80 },
  { label:'Employee Relations',href:'/employee-relations',permission:'er.intake',icon:'â‰‹',keywords:['relations','case'],area:'more',priority:80 },
  { label:'Health & Safety',href:'/safety',permission:'safety.report',icon:'âœš',keywords:['incident','safety'],area:'more',priority:80 },
  { label:'Employee Service Center',href:'/employee-service-center',permission:'service.read',icon:'?',keywords:['get help','hr case','service center','employment letter'],area:'more',priority:78 },
  { label:'Meeting â†’ Action',href:'/meeting-actions',permission:'self.read',icon:'â†’',keywords:['meeting actions','meeting notes','follow up','decisions'],area:'more',priority:77 },
  { label:'Experience & HR Help',href:'/experience',permission:'experience.read',icon:'â™¡',keywords:['help','service request'],area:'more',priority:75 },
  { label:'Lifecycle',href:'/lifecycle',permission:'team.read',icon:'â†»',keywords:['employee lifecycle'],area:'more',priority:70 },
  { label:'HR Diagnostic',href:'/hr-diagnostic',permission:'diagnostic.read',icon:'â—ˆ',keywords:['diagnostic','assessment'],area:'more',priority:65 },
  { label:'Governance Center',href:'/governance',permission:'governance.read',icon:'â¬¡',keywords:['governance'],area:'more',priority:60 },
  { label:'Policy & Regulatory',href:'/regulatory',permission:'regulatory.read',icon:'Â§',keywords:['regulation','policy'],area:'more',priority:60 },
  { label:'Audit & Assurance',href:'/assurance',permission:'assurance.read',icon:'âœ“',keywords:['assurance','audit'],area:'more',priority:60 },
  { label:'Privacy & AI Assurance',href:'/privacy',permission:'privacy.read',icon:'â—',keywords:['privacy','ai assurance'],area:'more',priority:60 },
  { label:'Workforce Resilience',href:'/resilience',permission:'resilience.read',icon:'âˆž',keywords:['resilience'],area:'more',priority:55 },
  { label:'Human Capital Strategy',href:'/strategy',permission:'strategy.read',icon:'â—Ž',keywords:['strategy'],area:'more',priority:55 },
  { label:'Org Design',href:'/org-design',permission:'orgdesign.read',icon:'âŒ˜',keywords:['organization design'],area:'more',priority:55 },

  { label:'Settings',href:'/settings',icon:'âš™',keywords:['preferences','profile settings'],area:'admin',priority:100 },
  { label:'Experience Readiness',href:'/experience-readiness',permission:'self.read',icon:'â—',keywords:['accessibility','wcag','translation','language coverage'],area:'more',priority:84 },
  { label:'Translation Readiness',href:'/translation-readiness',permission:'self.read',icon:'æ–‡',keywords:['translation readiness','translation backlog','language completion','localization inventory'],area:'more',priority:83 },
  { label:'Organization Launchpad',href:'/organization-launchpad',permission:'organization.manage',icon:'â—Ž',keywords:['organization setup','launchpad','one click setup','tenant setup'],area:'admin',priority:99 },
  { label:'Admin Data & Maintenance',href:'/admin-maintenance',permission:'platform.manage',icon:'âŒ˜',keywords:['maintenance','cleanup','cache','storage','health','reset','edit','data quality'],area:'admin',priority:98 },
  { label:'Import Center',href:'/import-center',permission:'documents.manage',icon:'â‡©',keywords:['import','bulk upload','migration'],area:'admin',priority:95 },
  { label:'Automation',href:'/automation',permission:'automation.read',icon:'âš™',keywords:['automation','jobs'],area:'admin',priority:90 },
  { label:'Agent Builder',href:'/agent-builder',permission:'ai.manage',icon:'âœ¦',keywords:['agent builder','custom agent','cortex agent'],area:'admin',priority:94 },
  { label:'Automation Marketplace',href:'/automation-marketplace',permission:'workflow.read',icon:'â–¦',keywords:['automation marketplace','workflow pack','automation pack'],area:'admin',priority:93 },
  { label:'AI Governance Center',href:'/ai-governance',permission:'ai.use',icon:'â¬¡',keywords:['ai governance','agents','shadow mode','cortex control'],area:'admin',priority:92 },
  { label:'AI Value Dashboard',href:'/ai-value',permission:'ai.audit',icon:'â–¥',keywords:['ai value','roi','ai impact','ai usage'],area:'admin',priority:91 },
  { label:'AI HR Copilot',href:'/ai-copilot',permission:'ai.use',icon:'âœ¦',keywords:['ai','copilot'],area:'admin',priority:90 },
  { label:'Integrations',href:'/integrations',permission:'integration.read',icon:'â›“',keywords:['integration','connector'],area:'admin',priority:80 },
  { label:'Identity & SSO',href:'/identity',permission:'identity.read',icon:'â—‡',keywords:['identity','sso'],area:'admin',priority:75 },
  { label:'Security Operations',href:'/security-operations',permission:'securityops.read',icon:'â¬¢',keywords:['security operations'],area:'admin',priority:75 },
  { label:'Security Admin',href:'/security',permission:'security.manage',icon:'â–£',keywords:['security admin'],area:'admin',priority:70 },
  { label:'Platform Reliability',href:'/platform-reliability',permission:'platform.read',icon:'â—‰',keywords:['reliability','health'],area:'admin',priority:70 },
  { label:'Premium HCM Certification',href:'/premium-hcm',permission:'platform.read',icon:'C',keywords:['premium hcm','certification','release evidence'],area:'admin',priority:69 },
  { label:'Platform Companies',href:'/platform-tenants',permission:'platform.manage',roles:['super_admin'],icon:'â–¦',keywords:['tenant','company','super admin'],area:'admin',priority:70 },
  { label:'Audit Trail',href:'/audit',permission:'audit.read',icon:'â–¤',keywords:['audit trail','history'],area:'admin',priority:70 },
  { label:'Members',href:'/members',permission:'membership.read',icon:'â—«',keywords:['members','access'],area:'admin',priority:65 },
];

const groupDefinitions: Array<{ area: Item['area']; label: string; defaultClosed?: boolean }> = [
  { area:'home', label:'Start' },
  { area:'people', label:'People' },
  { area:'work', label:'Talent & Work' },
  { area:'insights', label:'Insights' },
  { area:'more', label:'More', defaultClosed:true },
  { area:'admin', label:'Admin & Platform', defaultClosed:true },
];

function canSee(item: Item, permissions: string[] | null, role:string|null): boolean {
  if (permissions === null) return ['/home','/dashboard','/self-service'].includes(item.href);
  return (!item.permission || permissions.includes(item.permission)) && (!item.roles || Boolean(role&&item.roles.includes(role)));
}


export function Nav() {
  const pathname = usePathname();
  const shellLocale = useShellLocale();
  const [permissions,setPermissions] = useState<string[]|null>(null);
  const [role,setRole] = useState<string|null>(null);
  const [collapsed,setCollapsed] = useState(false);
  const [query,setQuery] = useState('');
  const [adaptiveTick,setAdaptiveTick] = useState(0);
  const [closedGroups,setClosedGroups] = useState<Record<string,boolean>>(
    Object.fromEntries(groupDefinitions.filter(g=>g.defaultClosed).map(g=>[g.label,true])),
  );

  useEffect(()=>{
    let alive = true;
    apiFetch<{actor:{permissions:string[];role:string}}>('/api/me')
      .then(r=>{ if(alive){setPermissions(r.actor.permissions);setRole(r.actor.role)} })
      .catch(()=>{ if(alive) setPermissions([]); });
    return ()=>{ alive = false; };
  },[]);

  useEffect(()=>{
    const match=allItems.find(item=>pathname===item.href||pathname.startsWith(`${item.href}/`));
    if(match) recordNavigationVisit(match.href);
    setAdaptiveTick(value=>value+1);
  },[pathname]);
  useEffect(()=>{const h=()=>setAdaptiveTick(value=>value+1);window.addEventListener('opsiqo:adaptive-navigation-changed',h);return()=>window.removeEventListener('opsiqo:adaptive-navigation-changed',h)},[]);

  const visibleItems = useMemo(
    ()=>allItems.filter(item=>canSee(item,permissions,role)),
    [permissions,role],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = useMemo(
    ()=>normalizedQuery ? rankNavigationItems(visibleItems,normalizedQuery) : [],
    [normalizedQuery,visibleItems],
  );
  const adaptiveState = useMemo(()=>readAdaptiveNavigation(),[adaptiveTick]);
  const suggestedItems = useMemo(()=>{
    const byHref=new Map(visibleItems.map(item=>[item.href,item]));
    return suggestedNavigationHrefs(new Set(visibleItems.map(item=>item.href)),5).map(href=>byHref.get(href)).filter((item):item is Item=>Boolean(item));
  },[visibleItems,adaptiveTick]);

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
    const active = pathname===item.href || pathname.startsWith(`${item.href}/`),pinned=adaptiveState.pinned.includes(item.href),renderedLabel=shellText(item.label,shellLocale),pinAction=shellText(pinned?'Unpin':'Pin',shellLocale);
    return (
      <div className="navItemWrap" key={item.href}>
        <Link href={item.href} className={`navItem ${active?'active':''}`} title={collapsed?renderedLabel:undefined} aria-current={active?'page':undefined} onClick={()=>setQuery('')}>
          <span className="navIcon" aria-hidden="true">{item.icon}</span><span className="navText">{renderedLabel}</span>
        </Link>
        {!collapsed&&<button type="button" className={`navPin ${pinned?'active':''}`} aria-label={`${pinAction} ${renderedLabel}`} onClick={()=>toggleNavigationPin(item.href)}>{pinned?'â˜…':'â˜†'}</button>}
      </div>
    );
  };

  return (
    <aside className={`sidebar ${collapsed?'collapsed':''}`} data-opsiqo-shell-i18n="true" aria-label={shellText('Application navigation',shellLocale)}>
      <div className="sidebarTop">
        <Link href="/home" className="brand" aria-label={shellText('OPSIQO home',shellLocale)}>
          <img className="brandLogo" src="/brand/opsiqo-wordmark.png" alt="OPSIQO" />
          <img className="brandIcon" src="/brand/opsiqo-icon.png" alt="" aria-hidden="true" />
        </Link>
        <OrganizationSwitcher/>
      </div>

      {!collapsed && (
        <div className="outcomeNav" data-opsiqo-shell-i18n="true" aria-label={shellText('OPSIQO ONE primary outcomes',shellLocale)}>
          <Link className={`outcomeNavItem ${pathname==='/home'?'active':''}`} href="/home"><span aria-hidden="true">âŒ‚</span><strong>{shellText('Home',shellLocale)}</strong></Link>
          <Link className={`outcomeNavItem ${pathname.startsWith('/my-work')?'active':''}`} href="/my-work"><span aria-hidden="true">âœ“</span><strong>{shellText('My Work',shellLocale)}</strong></Link>
          <Link className={`outcomeNavItem ${pathname.startsWith('/people')?'active':''}`} href="/people"><span aria-hidden="true">â—Œ</span><strong>{shellText('People',shellLocale)}</strong></Link>
          <Link className={`outcomeNavItem ${pathname.startsWith('/intelligence')?'active':''}`} href="/intelligence"><span aria-hidden="true">âœ¦</span><strong>{shellText('Intelligence',shellLocale)}</strong></Link>
          <Link className={`outcomeNavItem ${pathname.startsWith('/more')?'active':''}`} href="/more"><span aria-hidden="true">â€¢â€¢â€¢</span><strong>{shellText('More',shellLocale)}</strong></Link>
        </div>
      )}

      {!collapsed && (
        <div className="navFinder">
          <label className="navFinderLabel" htmlFor="opsiqo-nav-search">{shellText('Find',shellLocale)}</label>
          <input
            id="opsiqo-nav-search"
            className="navFinderInput"
            type="search"
            value={query}
            onChange={event=>setQuery(event.target.value)}
            placeholder={shellText('Page, task or moduleâ€¦',shellLocale)}
            autoComplete="off"
          />
          {normalizedQuery && (
            <div className="navSearchSummary" role="status">
              {searchResults.length ? (searchResults.length===1?shellText('1 result',shellLocale):shellText('{count} results',shellLocale).replace('{count}',String(searchResults.length))) : shellText('No matching page',shellLocale)}
            </div>
          )}
        </div>
      )}

      <nav className="navScroll" aria-label={shellText('Primary',shellLocale)}>
        {normalizedQuery ? (
          <section className="navGroup navSearchResults">
            <div className="navGroupStaticLabel">{shellText('Search results',shellLocale)}</div>
            <div className="navGroupItems">
              {searchResults.map(renderItem)}
              {!searchResults.length && (
                <div className="navEmptyState">{shellText('Try â€œleaveâ€, â€œpeopleâ€, â€œrecruitingâ€, â€œanalyticsâ€ or â€œsettingsâ€.',shellLocale)}</div>
              )}
            </div>
          </section>
        ) : (
          <>
          {suggestedItems.length>0&&<section className="navGroup navSuggested" data-adaptive-navigation="true"><div className="navGroupStaticLabel">{shellText('For you',shellLocale)}</div><div className="navGroupItems">{suggestedItems.map(renderItem)}</div></section>}
          {visibleGroups.map(group=>{
            const closed = closedGroups[group.label]===true;
            return (
              <section className={`navGroup ${closed?'closed':''}`} key={group.label}>
                <button
                  type="button"
                  className="navGroupLabel"
                  aria-expanded={!closed}
                  onClick={()=>setClosedGroups(value=>({...value,[group.label]:!value[group.label]}))}
                >
                  <span>{shellText(group.label,shellLocale)}</span>
                  <span className="navGroupChevron" aria-hidden="true">{closed?'â€º':'âŒ„'}</span>
                </button>
                <div className="navGroupItems">{group.items.map(renderItem)}</div>
              </section>
            );
          })}
          </>
        )}
      </nav>

      <div className="sidebarFooter">
        <div className="phaseBadge"><span>OPSIQO ONE</span><strong>v7.32 Â· HCM v8.5</strong></div>
        <button
          className="navCollapse"
          type="button"
          onClick={()=>setCollapsed(value=>!value)}
          aria-label={shellText(collapsed?'Expand navigation':'Collapse navigation',shellLocale)}
        >
          {collapsed?'Â»':'Â«'}<span>{collapsed?'':shellText('Collapse',shellLocale)}</span>
        </button>
      </div>
    </aside>
  );
}
