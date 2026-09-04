import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const checks=[];
const add=(name,pass)=>checks.push({name,pass:!!pass});
const nav=read('src/components/nav.tsx');
const shell=read('src/lib/opsiqo-one/shell-i18n.ts');
const diag=read('src/lib/opsiqo-one/runtime-localization-diagnostics.ts');
const home=read('src/components/superapp-workspace.tsx');
const readiness=read('src/components/translation-readiness-workspace.tsx');
const runtime=read('src/lib/opsiqo-one/runtime-ui-translations-v7-32.json');
const legacy=read('src/lib/opsiqo-one/legacy-surface-i18n.ts');

add('Nav renders localized item label',nav.includes('renderedLabel=shellText(item.label,shellLocale)'));
add('Nav no longer renders raw item.label text',!nav.includes('className="navText">{item.label}</span>'));
add('Nav localizes pin/unpin aria',nav.includes('aria-label={`${pinAction} ${renderedLabel}`}'));
add('Nav localizes result count',nav.includes("shellText('{count} results',shellLocale)"));
add('Nav localizes collapse control',nav.includes("shellText('Collapse',shellLocale)"));
add('Shell has expanded H27 dictionary',shell.includes('const SHELL_EXTRA:'));
for(const key of ['Compliance Radar','Translation Readiness','Organization Launchpad','AI Governance Center','Security Operations','Members']){
  add('Shell Arabic map: '+key,shell.includes(JSON.stringify(key))&&shell.includes('ar'));
}

add('Organization switcher uses shell locale',read('src/components/organization-switcher.tsx').includes("shellText('Organization',shellLocale)"));
add('Home priority sentence is runtime-localized',home.includes("rt('The five highest-priority verified items for today.')"));
add('Home Open My Work is runtime-localized',home.includes("rt('Open My Work')"));
add('Authoritative tenant assignment data is excluded from UI residual audit',home.includes('data-opsiqo-i18n-allow="true"'));
add('Translation readiness computed badge is runtime-localized',readiness.includes("rt(`${pct}% exact-source reviewed`)"));
add('Translation readiness footer is runtime-localized',readiness.includes('rt(`Snapshot:'));

add('Diagnostics do not suppress mapped-but-visible English',!diag.includes('hasRuntimeUiTranslation'));
add('Diagnostics inspect visible attributes',diag.includes("'[placeholder],[title],[aria-label],[alt]'"));
add('Diagnostics expose machine-readable browser result',diag.includes('__OPSIQO_LOCALIZATION_AUDIT__'));
add('Diagnostics expose residual count dataset',diag.includes('opsiqoLocalizationResidualCount'));
add('Diagnostics enforce direction',diag.includes('directionMismatch'));
add('Diagnostics preserve explicit no-translate boundary',diag.includes('data-opsiqo-no-translate'));
add('Diagnostics preserve authoritative-data allow boundary',diag.includes('data-opsiqo-i18n-allow'));

for(const source of [
  'Compliance evidence requires assessment',
  "{name}'s evidence-backed skills",
  'Ask the organization, not the internet',
  'PREHIRES / ONBOARDING',
  'Documents available to you',
  '{pct}% exact-source reviewed'
]) add('Runtime translation exists: '+source,runtime.includes(JSON.stringify(source)));

add('Legacy surface-local translation remains before runtime/global reuse',legacy.indexOf('if(local?.[locale]) return local[locale]')<legacy.indexOf('runtimeUiTranslation(source,locale)'));
add('Global translator still excludes explicitly governed shell',legacy.includes("parent?.closest('[data-opsiqo-shell-i18n=\"true\"]')"));

const failures=checks.filter(x=>!x.pass);
console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',checks:checks.length,failures},null,2));
if(failures.length)process.exit(1);
