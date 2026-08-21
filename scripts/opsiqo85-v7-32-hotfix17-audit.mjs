#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const worker=read('scripts/opsiqo85-v7-32-authenticated-accessibility-worker.mjs');
const shell=read('src/lib/opsiqo-one/shell-i18n.ts');
const css=read('src/app/globals.css');
const command=read('src/components/integration-command-center.tsx');
const runtime=read('src/components/integration-runtime-center.tsx');
const daily=read('src/components/daily-brief-workspace.tsx');
const governance=read('src/components/ai-governance-center.tsx');
const service=read('src/components/employee-service-center-workspace.tsx');
const grants=read('src/components/grant-workforce-workspace.tsx');
const recruiting=read('src/components/recruiting-workspace.tsx');
const resume=read('src/components/resume-intake-assistant.tsx');
const pkg=JSON.parse(read('package.json'));
const runner=read('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1');
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

check('Browser name detector honors aria-labelledby',worker.includes("getAttribute('aria-labelledby')")&&worker.includes('referencedText'));
check('Browser name detector honors associated labels',worker.includes('e.labels')&&worker.includes('labelText'));
check('Browser still validates Chrome accessibility-tree names',worker.includes("Accessibility.getFullAXTree")&&worker.includes("accessibility-tree-names"));
check('Arabic runtime test dispatches locale detail',worker.includes("new CustomEvent('opsiqo:locale-changed',{detail:{locale:'ar'}})"));
check('Arabic runtime test remains fail-closed on marker evidence',worker.includes("if(marker)add('operational-arabic-translation'"));
check('MFA security shell is explicitly distinguished from outcome shell',worker.includes("securityShellRoute=route==='/mfa/setup'")&&worker.includes('security shell mobile outcome nav'));
check('Normal authenticated routes still require five mobile outcomes',worker.includes("v.mobileNav&&v.mobileLinks===5"));
check('Shell locale consumes explicit locale-change event detail',shell.includes('event instanceof CustomEvent')&&shell.includes('event.detail?.locale'));
check('Integration command translation root remains attached after load',command.includes('return <div ref={translationRoot} className="stack">'));
check('Integration runtime translation root remains attached after load',runtime.includes('return <div ref={translationRoot} className="stack">'));
check('Daily Brief presentation follows live shell locale',daily.includes('useShellLocale')&&daily.includes('const shellLocale=useShellLocale()'));
check('AI Governance agent action selector is named',governance.includes('aria-label={`${a.agentName} action level`}'));
check('Employee Service Center controls have explicit accessible names',service.includes('aria-label="HR service"')&&service.includes('aria-label="Request subject"')&&service.includes('aria-label="Request description"')&&service.includes('aria-label="Search HR knowledge"'));
check('Grant Workforce forms have explicit accessible names',grants.includes('aria-label="Funding source code"')&&grants.includes('aria-label="Allocation percent"')&&grants.includes('aria-label="Allocation start date"'));
check('Recruiting stage control has candidate-specific name',recruiting.includes('application stage`}'));
check('Recruiting score evidence inputs are named',recruiting.includes('evidence or observation`}'));
check('Recruiting resume file control is named',resume.includes('aria-label="Candidate resume file"'));
check('Interactive form controls have 24px minimum target size',css.includes('button,input:not([type="hidden"]),select,textarea,[role="button"],.navPin{min-inline-size:24px;min-block-size:24px}'));
check('Checkbox and radio target sizing is explicit',css.includes('input[type="checkbox"],input[type="radio"]{inline-size:24px;block-size:24px'));
check('Mobile reflow hardening preserves min-width zero on shared containers',css.includes('.stack,.card,.grid2,.grid4,.metricGrid,.briefGrid,.settingsGrid,.mainInner,.oneHero,.oneWorkItem,.toolbar,.row,.pageHeader{min-width:0;max-width:100%}'));
check('Package exposes H17 audit',pkg.scripts?.['opsiqo85:v7.32:hotfix17:audit']==='node scripts/opsiqo85-v7-32-hotfix17-audit.mjs');
check('Package exposes H17 targeted test',pkg.scripts?.['test:opsiqo-one-v7.32-hotfix17']==='vitest run tests/opsiqo85/opsiqo-one-v7-32-hotfix17.test.ts');
check('Canonical runner executes H17 audit',runner.includes('opsiqo85:v7.32:hotfix17:audit'));
check('Canonical runner executes H17 targeted test',runner.includes('test:opsiqo-one-v7.32-hotfix17'));

for(const c of checks)console.log(`${c.ok?'PASS':'FAIL'} ${c.name}`);
const passed=checks.filter(c=>c.ok).length;
console.log(`\nOPSIQO V7.32 Hotfix 17 audit: ${passed}/${checks.length} PASS`);
if(passed!==checks.length)process.exit(1);
