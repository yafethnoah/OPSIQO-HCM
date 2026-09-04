#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const shell=read('src/lib/opsiqo-one/shell-i18n.ts');
const legacy=read('src/lib/opsiqo-one/legacy-surface-i18n.ts');
const bootstrap=read('src/components/language-bootstrap.tsx');
const mobile=read('src/components/mobile-outcome-nav.tsx');
const nav=read('src/components/nav.tsx');
const css=read('src/app/globals.css');
const worker=read('scripts/opsiqo85-v7-32-authenticated-accessibility-worker.mjs');
const pkg=JSON.parse(read('package.json'));
const runner=read('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1');
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

check('Shell locale initializes from current document locale',shell.includes("useState<ShellLocale>(()=>currentShellLocale())"));
check('Shell locale observes html locale attributes',shell.includes('new MutationObserver')&&shell.includes("attributeFilter:['data-opsiqo-locale','lang','dir']"));
check('Shell locale keeps explicit locale event support',shell.includes("event instanceof CustomEvent")&&shell.includes('event.detail?.locale'));
check('Language bootstrap stores effective shell locale',bootstrap.includes('dataset.opsiqoLocale=effective'));
check('Global reviewed translator excludes shell-owned localization',legacy.includes('[data-opsiqo-shell-i18n="true"]'));
check('Mobile outcome navigation is shell-owned',mobile.includes('data-opsiqo-shell-i18n="true"'));
check('Desktop primary outcomes are shell-owned',nav.includes('className="outcomeNav" data-opsiqo-shell-i18n="true"'));
check('Sidebar navigation targets have explicit physical minimum size',css.includes('.navItem{min-height:32px;min-width:24px}'));
check('Navigation pin target has explicit 32px box',css.includes('.navPin{width:32px;height:32px;min-width:32px;min-height:32px'));
check('Mobile shell targets retain explicit physical sizing',css.includes('.sidebar a[href],.sidebar button{min-height:32px}'));
check('Target-size UAT preserves WCAG inline-text exception only',worker.includes("inlineTextLink=e.tagName==='A'&&display==='inline'")&&worker.includes('!x.inlineTextLink&&(x.w<24||x.h<24)'));
check('Target-size UAT records bounded failing-target examples',worker.includes('smallTargetExamples')&&worker.includes('examples='));
check('Arabic shell gate remains fail closed',worker.includes("add('arabic-rtl-shell'")&&worker.includes("av.dir==='rtl'"));
check('Operational Arabic marker gate remains fail closed',worker.includes("if(marker)add('operational-arabic-translation'"));
check('Package exposes H19 audit',pkg.scripts?.['opsiqo85:v7.32:hotfix19:audit']==='node scripts/opsiqo85-v7-32-hotfix19-audit.mjs');
check('Package exposes H19 targeted test',pkg.scripts?.['test:opsiqo-one-v7.32-hotfix19']==='vitest run tests/opsiqo85/opsiqo-one-v7-32-hotfix19.test.ts');
check('Canonical runner executes H19 audit',runner.includes('opsiqo85:v7.32:hotfix19:audit'));
check('Canonical runner executes H19 targeted test',runner.includes('test:opsiqo-one-v7.32-hotfix19'));

for(const c of checks)console.log(`${c.ok?'PASS':'FAIL'} ${c.name}`);
const passed=checks.filter(c=>c.ok).length;
console.log(`\nOPSIQO V7.32 Hotfix 19 audit: ${passed}/${checks.length} PASS`);
if(passed!==checks.length)process.exit(1);
