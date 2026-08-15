'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/http/client';
import { OrganizationSwitcher } from './organization-switcher';

type Item={label:string;href:string;permission?:string;icon:string};
type Group={label:string;items:Item[]};
const groups:Group[]=[
  {label:'Command',items:[
    {label:'Command Center',href:'/dashboard',permission:'commandcenter.read',icon:'⌘'},
    {label:'Operations Cockpit',href:'/operations-cockpit',permission:'commandcenter.read',icon:'◫'},
    {label:'Operations Orchestrator',href:'/operations-orchestrator',permission:'workflow.read',icon:'⇢'},
    {label:'Lifecycle',href:'/lifecycle',permission:'team.read',icon:'↻'},
    {label:'Notifications',href:'/notifications',permission:'notifications.read',icon:'◉'},
  ]},
  {label:'People',items:[
    {label:'People',href:'/people',permission:'people.read.directory',icon:'◌'},
    {label:'Organization',href:'/organization',permission:'positions.read',icon:'◇'},
    {label: 'My OPSIQO',href: '/home',permission: 'self.read',icon:'◎'},
    {label:'My HR',href:'/self-service',permission:'self.read',icon:'◎'},
    {label:'Manager',href:'/manager',permission:'team.read',icon:'△'},
    {label:'Members',href:'/members',permission:'membership.read',icon:'◫'},
  ]},
  {label:'Talent',items:[
    {label:'Recruiting',href:'/recruiting',permission:'recruiting.read',icon:'⌕'},
    {label:'Onboarding',href:'/onboarding',permission:'onboarding.read',icon:'＋'},
    {label:'Performance',href:'/performance',permission:'performance.read',icon:'◆'},
    {label:'Skills & Learning',href:'/learning',permission:'learning.read',icon:'△'},
    {label:'Career & Succession',href:'/career',permission:'career.read',icon:'↗'},
  ]},
  {label:'Workforce',items:[
    {label:'Time & Leave',href:'/time',permission:'time.read',icon:'◷'},
    {label:'Compensation',href:'/compensation',permission:'compensation.read',icon:'$'},
    {label:'Workforce Planning',href:'/workforce-planning',permission:'workforce.read',icon:'▦'},
    {label:'People Analytics',href:'/people-analytics',permission:'peopleanalytics.read',icon:'▥'},
    {label:'Workforce Intelligence',href:'/workforce-intelligence',permission:'peopleanalytics.read',icon:'◈'},
    {label:'Offboarding',href:'/separations',permission:'separation.read',icon:'↙'},
  ]},
  {label:'Employee Governance',items:[
    {label:'Compliance',href:'/compliance',permission:'compliance.read',icon:'✓'},
    {label:'Evidence Center',href:'/evidence-center',permission:'compliance.read',icon:'▣'},
    {label:'Employee Relations',href:'/employee-relations',permission:'er.intake',icon:'≋'},
    {label:'Health & Safety',href:'/safety',permission:'safety.report',icon:'✚'},
    {label:'Experience & HR Help',href:'/experience',permission:'experience.read',icon:'♡'},
  ]},
  {label:'Risk & Assurance',items:[
    {label:'HR Diagnostic',href:'/hr-diagnostic',permission:'diagnostic.read',icon:'◈'},
    {label:'Governance Center',href:'/governance',permission:'governance.read',icon:'⬡'},
    {label:'Policy & Regulatory',href:'/regulatory',permission:'regulatory.read',icon:'§'},
    {label:'Audit & Assurance',href:'/assurance',permission:'assurance.read',icon:'✓'},
    {label:'Privacy & AI Assurance',href:'/privacy',permission:'privacy.read',icon:'◐'},
    {label:'Workforce Resilience',href:'/resilience',permission:'resilience.read',icon:'∞'},
    {label:'Human Capital Strategy',href:'/strategy',permission:'strategy.read',icon:'◎'},
    {label:'Org Design',href:'/org-design',permission:'orgdesign.read',icon:'⌘'},
  ]},
  {label:'Platform',items:[
    {label:'Import Center',href:'/import-center',permission:'documents.manage',icon:'⇩'},
    {label:'Settings',href:'/settings',icon:'⚙'},
    {label:'Integrations',href:'/integrations',permission:'integration.read',icon:'⛓'},
    {label:'Identity & SSO',href:'/identity',permission:'identity.read',icon:'◇'},
    {label:'Security Operations',href:'/security-operations',permission:'securityops.read',icon:'⬢'},
    {label:'Platform Reliability',href:'/platform-reliability',permission:'platform.read',icon:'◉'},
    {label:'AI HR Copilot',href:'/ai-copilot',permission:'ai.use',icon:'✦'},
    {label:'Workflows',href:'/workflows',permission:'workflow.read',icon:'⌁'},
    {label:'Automation',href:'/automation',permission:'automation.read',icon:'⚙'},
    {label:'Security Admin',href:'/security',permission:'security.manage',icon:'▣'},
    {label:'Audit Trail',href:'/audit',permission:'audit.read',icon:'▤'},
  ]},
];

export function Nav() {
  const pathname=usePathname();
  const[permissions,setPermissions]=useState<string[]|null>(null);
  const[collapsed,setCollapsed]=useState(false);
  const[closedGroups,setClosedGroups]=useState<Record<string,boolean>>({});
  useEffect(()=>{apiFetch<{actor:{permissions:string[]}}>('/api/me').then(r=>setPermissions(r.actor.permissions)).catch(()=>setPermissions([]));},[]);
  const visibleGroups=useMemo(()=>groups.map(group=>({
    ...group,
    items: group.items.filter(i=>permissions===null?['/home', '/dashboard', '/self-service'].includes(i.href):!i.permission||permissions.includes(i.permission)),
  })).filter(g=>g.items.length),[permissions]);
  return <aside className={`sidebar ${collapsed?'collapsed':''}`}>
    <div className="sidebarTop">
      <Link href="/dashboard" className="brand" aria-label="OPSIQO HCM home">
        <img className="brandLogo" src="/brand/opsiqo-wordmark.png" alt="OPSIQO" />
        <img className="brandIcon" src="/brand/opsiqo-icon.png" alt="OPSIQO" />
      </Link>
      <OrganizationSwitcher/>
    </div>
    <nav className="navScroll" aria-label="Primary">
      {visibleGroups.map(group=>{const closed=closedGroups[group.label]===true;return <section className={`navGroup ${closed?'closed':''}`} key={group.label}>
        <button type="button" className="navGroupLabel" aria-expanded={!closed} onClick={()=>setClosedGroups(v=>({...v,[group.label]:!v[group.label]}))}><span>{group.label}</span><span className="navGroupChevron">{closed?'›':'⌄'}</span></button>
        <div className="navGroupItems">{group.items.map(item=>{
          const active=pathname===item.href||pathname.startsWith(`${item.href}/`);
          return <Link key={item.href} href={item.href} className={`navItem ${active?'active':''}`} title={collapsed?item.label:undefined}>
            <span className="navIcon" aria-hidden="true">{item.icon}</span><span className="navText">{item.label}</span>
          </Link>;
        })}</div>
      </section>})}
    </nav>
    <div className="sidebarFooter">
      <div className="phaseBadge"><span>Enterprise HCM</span><strong>v8.5</strong></div>
      <button className="navCollapse" type="button" onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?'Expand navigation':'Collapse navigation'}>{collapsed?'»':'«'}<span>{collapsed?'':'Collapse'}</span></button>
    </div>
  </aside>;
}
