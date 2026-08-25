import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {shellText} from '@/lib/opsiqo-one/shell-i18n';
import {runtimeUiTranslation} from '@/lib/opsiqo-one/runtime-ui-i18n';

const read=(p:string)=>fs.readFileSync(p,'utf8');

const navLabels=[
'Home','My Work','HR Overview','Notifications','Daily Brief','My HR','Employee Concierge','Manager Copilot','Employee Portal','People','My Team','Organization','Unified Workforce',
'Recruiting','Onboarding','Time & Leave','Performance','Learning','Skills Passport','Career GPS','Talent Marketplace','Compensation','Workflows',
'Intelligence','People Analytics','Workforce Intelligence','Workforce Planning','Scenario Lab','Grant Workforce','Program Workforce','Program Portfolio','Operations Cockpit','Operations Orchestrator',
'Career & Succession','Offboarding','Organizational Memory','Policy Intelligence','Compliance Radar','Compliance','Evidence Center','Employee Relations','Health & Safety','Employee Service Center','Meeting → Action','Experience & HR Help','Lifecycle','HR Diagnostic','Governance Center','Policy & Regulatory','Audit & Assurance','Privacy & AI Assurance','Workforce Resilience','Human Capital Strategy','Org Design',
'Settings','Experience Readiness','Translation Readiness','Organization Launchpad','Import Center','Automation','Agent Builder','Automation Marketplace','AI Governance Center','AI Value Dashboard','AI HR Copilot','Integrations','Identity & SSO','Security Operations','Security Admin','Platform Reliability','Audit Trail','Members'
];

describe('OPSIQO V7.32 H27 browser localization closure',()=>{
  it('covers every governed nav item explicitly in Arabic',()=>{
    for(const label of navLabels)expect(shellText(label,'ar'),label).not.toBe(label);
  });

  it('preserves English identity while localizing shell controls',()=>{
    expect(shellText('Compliance Radar','en')).toBe('Compliance Radar');
    expect(shellText('Compliance Radar','ar')).toBe('رادار الامتثال');
    expect(shellText('Collapse navigation','fr')).not.toBe('Collapse navigation');
    expect(shellText('Expand navigation','es')).not.toBe('Expand navigation');
  });

  it('translates exact and template runtime gaps from live UAT',()=>{
    expect(runtimeUiTranslation('Compliance evidence requires assessment','ar')).toContain('الامتثال');
    expect(runtimeUiTranslation("Shadi Alktaifan's evidence-backed skills",'ar')).toContain('Shadi Alktaifan');
    expect(runtimeUiTranslation('100% exact-source reviewed','ar')).toContain('100');
    expect(runtimeUiTranslation('Sources for “leave”','fr')).toContain('leave');
  });

  it('makes rendered-browser leakage observable even when a catalog mapping exists',()=>{
    const source=read('src/lib/opsiqo-one/runtime-localization-diagnostics.ts');
    expect(source).not.toContain('hasRuntimeUiTranslation');
    expect(source).toContain('__OPSIQO_LOCALIZATION_AUDIT__');
    expect(source).toContain('opsiqoLocalizationResidualCount');
    expect(source).toContain('[placeholder],[title],[aria-label],[alt]');
  });

  it('keeps shell exclusion and surface-local precedence intact',()=>{
    const source=read('src/lib/opsiqo-one/legacy-surface-i18n.ts');
    expect(source).toContain('[data-opsiqo-shell-i18n="true"]');
    expect(source.indexOf('if(local?.[locale]) return local[locale]')).toBeLessThan(source.indexOf('runtimeUiTranslation(source,locale)'));
  });

  it('removes known raw Home and nav rendering leaks',()=>{
    expect(read('src/components/nav.tsx')).not.toContain('className="navText">{item.label}</span>');
    expect(read('src/components/superapp-workspace.tsx')).not.toContain('<p className="muted">The five highest-priority verified items for today.</p>');
    expect(read('src/components/superapp-workspace.tsx')).not.toContain('href="/my-work">Open My Work →</Link>');
  });
});
