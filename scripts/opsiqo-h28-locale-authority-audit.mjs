import fs from 'node:fs';
import path from 'node:path';

const read=(p)=>fs.readFileSync(p,'utf8');
const checks=[];
const add=(name,pass)=>checks.push({name,pass:!!pass});

const layout=read('src/app/layout.tsx');
const bootstrap=read('src/components/runtime-locale-bootstrap.tsx');
const compatibility=read('src/components/language-bootstrap.tsx');
const runtime=read('src/lib/opsiqo-one/runtime-locale.ts');
const shell=read('src/lib/opsiqo-one/shell-i18n.ts');
const nav=read('src/components/nav.tsx');
const appShell=read('src/components/app-shell.tsx');
const legacy=read('src/lib/opsiqo-one/legacy-surface-i18n.ts');
const settings=read('src/components/settings-workspace.tsx');
const superapp=read('src/components/superapp-workspace.tsx');

add('Root layout removes networked LanguageBootstrap',!layout.includes('LanguageBootstrap'));
add('Root layout uses hydration-safe locale bootstrap',layout.includes('RuntimeLocaleBootstrap')&&layout.includes('suppressHydrationWarning'));
add('Pre-hydration bootstrap uses canonical runtime locale storage key',bootstrap.includes('opsiqo.runtimeLocale'));
add('Compatibility LanguageBootstrap performs no network work',!compatibility.includes('apiFetch')&&!compatibility.includes('applyRuntimeLocale'));

add('Runtime locale exposes explicit user preference setter',runtime.includes('setRuntimeLocalePreference'));
add('Runtime locale exposes organization default helper',runtime.includes('applyOrganizationRuntimeLocale'));
add('Runtime locale resolves user preference and organization default together',runtime.includes('/superapp/preferences')&&runtime.includes('/platform-settings')&&runtime.includes('Promise.allSettled'));
add('Runtime locale records source identity',runtime.includes('opsiqoLocaleSource'));
add('Runtime locale gives stored/user preference precedence',runtime.indexOf('if(stored)applyRuntimeLocale')<runtime.indexOf('const orgId=tryActiveOrgId()'));

add('Shell locale hydrates deterministically in English',shell.includes("useState<ShellLocale>('en')"));
add('Whole desktop navigation is React-i18n-owned',nav.includes('data-opsiqo-shell-i18n="true" aria-label={shellText(\'Application navigation\''));
add('AppShell isolates command bar from DOM translator',appShell.includes('data-opsiqo-shell-i18n="true"><OpsiQoCommandBar'));
add('AppShell isolates mobile nav from DOM translator',appShell.includes('data-opsiqo-shell-i18n="true"><MobileOutcomeNav'));
add('AppShell exposes route surface host',appShell.includes('data-opsiqo-route-surface-host="true"'));
add('AppShell installs route-reviewed translation',appShell.includes('useRouteReviewedTranslation(pathname,!publicBootstrap)'));

add('Global translator excludes route-owned surfaces',legacy.includes("parent?.closest('[data-opsiqo-route-surface]')"));
const routeCatalog=JSON.parse(read('src/lib/opsiqo-one/legacy-surface-translations-v7-32.json'));
/* H28E_GRANT_AUDIT_START */
const grantWorkforceSurface=routeCatalog['grant-workforce'];
const grantWorkforceHeadlineKey='Funding \u2192 workforce exposure, without guessing';
const grantWorkforceHeadline=grantWorkforceSurface?.translations?.[grantWorkforceHeadlineKey];
add('Grant Workforce has direct reviewed surface',grantWorkforceSurface?.file==='src/components/grant-workforce-workspace.tsx');
add('Grant Workforce reviewed surface has Arabic',Boolean(grantWorkforceHeadline?.ar));
add('Grant Workforce reviewed surface has French',Boolean(grantWorkforceHeadline?.fr));
add('Grant Workforce reviewed surface has Spanish',Boolean(grantWorkforceHeadline?.es));
/* H28E_GRANT_AUDIT_END */
const translationReadiness=read('src/components/translation-readiness-workspace.tsx');
add('Route localization ownership model exists',legacy.includes('export function routeLocalizationOwnership('));
add('Native React routes are isolated from global DOM translation',legacy.includes("data-opsiqo-route-surface','native-react"));
add('Translation Readiness is native React localized',translationReadiness.includes('useShellLocale')&&translationReadiness.includes('fr:{')&&translationReadiness.includes('es:{')&&translationReadiness.includes('ar:{')&&translationReadiness.includes('T=text[locale]||text.en'));
add('Translation Readiness dynamic boundary uses runtime translation',translationReadiness.includes('rt(data.boundary)'));
const organizationalMemorySurface=routeCatalog['organizational-memory'];
add('Organizational Memory has direct reviewed surface',organizationalMemorySurface?.file==='src/components/organizational-memory-workspace.tsx');
add('Organizational Memory reviewed surface has Arabic',Boolean(organizationalMemorySurface?.translations?.['Ask the organization, not the internet']?.ar));
add('Organizational Memory reviewed surface has French',Boolean(organizationalMemorySurface?.translations?.['Ask the organization, not the internet']?.fr));
add('Organizational Memory reviewed surface has Spanish',Boolean(organizationalMemorySurface?.translations?.['Ask the organization, not the internet']?.es));
const programWorkforceSurface=routeCatalog['program_workforce'];
add('Program Workforce has explicit reviewed surface',programWorkforceSurface?.file==='src/components/program-workforce-workspace.tsx');
add('Program Workforce Worker has Arabic',Boolean(programWorkforceSurface?.translations?.Worker?.ar));
add('Program Workforce Worker has French',Boolean(programWorkforceSurface?.translations?.Worker?.fr));
add('Program Workforce Worker has Spanish',Boolean(programWorkforceSurface?.translations?.Worker?.es));
add('Route surface inference exists',legacy.includes('export function inferRouteSurface('));
add('Route translation skips explicit nested surfaces',legacy.includes("parent.closest('[data-opsiqo-legacy-surface]')"));
add('Route translation is locale reactive',legacy.includes("window.addEventListener('opsiqo:locale-changed',onLocaleChanged)"));

add('Settings does not directly call applyRuntimeLocale',!settings.includes('applyRuntimeLocale('));
add('Settings uses organization locale helper',settings.includes('applyOrganizationRuntimeLocale('));
add('SuperApp does not directly call applyRuntimeLocale',!superapp.includes('applyRuntimeLocale('));
add('SuperApp preference save uses central setter',superapp.includes("setRuntimeLocalePreference(next.locale||'auto')"));

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(p));
    else if(/\.tsx?$/.test(entry.name))out.push(p.replace(/\\/g,'/'));
  }
  return out;
}
const forbidden=[];
for(const file of walk('src')){
  if(file==='src/lib/opsiqo-one/runtime-locale.ts')continue;
  const source=read(file);
  if(/\bapplyRuntimeLocale\s*\(/.test(source))forbidden.push(file);
}
add('No independent applyRuntimeLocale writers remain',forbidden.length===0);

const failures=checks.filter(x=>!x.pass);
console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',checks:checks.length,failures,forbiddenLocaleWriters:forbidden},null,2));
if(failures.length)process.exit(1);
