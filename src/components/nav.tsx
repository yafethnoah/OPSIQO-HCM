'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/http/client';
import { OrganizationSwitcher } from './organization-switcher';

type Item={label:string;href:string;permission?:string};
const items:Item[]=[
  {label:'Enterprise HCM Command Center',href:'/dashboard',permission:'commandcenter.read'},
  {label:'Integration Command Center',href:'/integrations',permission:'integration.read'},
  {label:'Identity, SSO & Provisioning',href:'/identity',permission:'identity.read'},
  {label:'HCM Security Command Center',href:'/security-operations',permission:'securityops.read'},
  {label:'Platform Reliability & Supply Chain',href:'/platform-reliability',permission:'platform.read'},
  {label:'Lifecycle',href:'/lifecycle',permission:'team.read'},
  {label:'People',href:'/people',permission:'people.read.directory'},
  {label:'Organization',href:'/organization',permission:'positions.read'},
  {label:'Recruiting',href:'/recruiting',permission:'recruiting.read'},
  {label:'Onboarding',href:'/onboarding',permission:'onboarding.read'},
  {label:'Compliance',href:'/compliance',permission:'compliance.read'},
  {label:'Time & Leave',href:'/time',permission:'time.read'},
  {label:'Offboarding',href:'/separations',permission:'separation.read'},
  {label:'Performance',href:'/performance',permission:'performance.read'},
  {label:'Skills & Learning',href:'/learning',permission:'learning.read'},
  {label:'Career & Succession',href:'/career',permission:'career.read'},
  {label:'Compensation',href:'/compensation',permission:'compensation.read'},
  {label:'Employee Relations',href:'/employee-relations',permission:'er.intake'},
  {label:'Health & Safety',href:'/safety',permission:'safety.report'},
  {label:'Experience & HR Help',href:'/experience',permission:'experience.read'},
  {label:'Workforce Planning',href:'/workforce-planning',permission:'workforce.read'},
  {label:'People Analytics',href:'/people-analytics',permission:'peopleanalytics.read'},
  {label:'AI HR Copilot',href:'/ai-copilot',permission:'ai.use'},
  {label:'HR Diagnostic',href:'/hr-diagnostic',permission:'diagnostic.read'},
  {label:'Governance Center',href:'/governance',permission:'governance.read'},
  {label:'Policy & Regulatory Change',href:'/regulatory',permission:'regulatory.read'},
  {label:'Audit & Assurance',href:'/assurance',permission:'assurance.read'},
  {label:'Privacy & AI Assurance',href:'/privacy',permission:'privacy.read'},
  {label:'Workforce Resilience',href:'/resilience',permission:'resilience.read'},
  {label:'Human Capital Strategy',href:'/strategy',permission:'strategy.read'},
  {label:'Org Design & Operating Model',href:'/org-design',permission:'orgdesign.read'},
  {label:'Members',href:'/members',permission:'membership.read'},
  {label:'Workflows',href:'/workflows',permission:'workflow.read'},
  {label:'Automation',href:'/automation',permission:'automation.read'},
  {label:'Notifications',href:'/notifications',permission:'notifications.read'},
  {label:'Security',href:'/security',permission:'security.manage'},
  {label:'Audit',href:'/audit',permission:'audit.read'},
  {label:'My HR',href:'/self-service',permission:'self.read'},
  {label:'Manager',href:'/manager',permission:'team.read'},
];

export function Nav() {
  const[permissions,setPermissions]=useState<string[]|null>(null);
  useEffect(()=>{apiFetch<{actor:{permissions:string[]}}>('/api/me').then(r=>setPermissions(r.actor.permissions)).catch(()=>setPermissions([]));},[]);
  const visible=permissions===null?items.filter(i=>['/dashboard','/self-service'].includes(i.href)):items.filter(i=>!i.permission||permissions.includes(i.permission));
  return <aside className="sidebar"><div className="brand"><div className="brandMark">O</div><div><strong>OPSIQO</strong><span>HCM</span></div></div><OrganizationSwitcher/><nav>{visible.map(item=><Link key={item.href} href={item.href} className="navItem">{item.label}</Link>)}</nav><div className="phaseBadge">Enterprise HCM Platform · v3.6.1</div></aside>;
}
