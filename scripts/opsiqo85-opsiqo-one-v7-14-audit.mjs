import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'),exists=p=>fs.existsSync(p);
const launchpad=read('src/lib/opsiqo-one/organization-launchpad.ts');
const brief=read('src/lib/opsiqo-one/daily-brief.ts');
const nav=read('src/components/nav.tsx');
const adaptive=read('src/lib/preferences/adaptive-navigation.ts');
const navIntel=read('src/lib/opsiqo-one/navigation-intelligence.ts');
const multilingual=read('src/lib/opsiqo-one/multilingual-intelligence.ts');
const aiService=read('src/lib/ai-intelligence/service.ts');
const aiSchema=read('src/lib/ai-intelligence/schemas.ts');
const commandRoute=read('src/app/api/organizations/[orgId]/opsiqo-one/command/route.ts');
const router=read('src/lib/opsiqo-one/command-router.ts');
const appShell=read('src/components/app-shell.tsx');
const layout=read('src/app/layout.tsx');
const sw=read('public/opsiqo-sw.js');
const manifest=read('src/app/manifest.ts');
const more=read('src/components/more-hub-workspace.tsx');
const checks=[
 ['V7.14 domain contract exists',exists('src/domain/opsiqo-one-v7-14.ts')],
 ['Organization Launchpad service exists',exists('src/lib/opsiqo-one/organization-launchpad.ts')],
 ['Launchpad requires organization management',launchpad.includes("requireAny(actor,'organization.manage')")],
 ['Launchpad requires platform management before regional defaults',launchpad.includes("requireAny(actor,'platform.manage')")],
 ['Launchpad requires notification management before digest defaults',launchpad.includes("requireAny(actor,'notifications.manage')")],
 ['Launchpad requires workflow management when packs are selected',launchpad.includes("if(profile.marketplacePackIds.length) requireAny(actor,'workflow.manage')")],
 ['Launchpad does not create workers',!launchpad.includes('/workers/')&&!launchpad.includes('createEmployee(')],
 ['Launchpad does not create positions',!launchpad.includes('/positions/')&&!launchpad.includes('createPosition(')],
 ['Launchpad does not grant membership roles',!launchpad.includes('/memberships/')&&!launchpad.includes('permissionsForRole')],
 ['Launchpad creates only explicitly selected departments',launchpad.includes('profile.departments')&&launchpad.includes("type:'department'")],
 ['Launchpad preserves existing platform security settings by merge',launchpad.includes('...platform')&&launchpad.includes('defaultLocale:profile.primaryLocale')],
 ['Launchpad selected workflow packs remain marketplace governed',launchpad.includes('installAutomationPack(actor,packId)')],
 ['Launchpad records an audit event',launchpad.includes('opsiqo_one.organization_launchpad.apply')],
 ['Launchpad checklist keeps security/member/policy/workflow review human-controlled',launchpad.includes("id:'members'")&&launchpad.includes("id:'policies'")&&launchpad.includes("id:'workflows'")&&launchpad.includes("id:'security'")],
 ['Launchpad states no legal conclusion',launchpad.includes('not a legal-compliance determination')],
 ['Launchpad API exists',exists('src/app/api/organizations/[orgId]/opsiqo-one/organization-launchpad/route.ts')],
 ['Launchpad workspace requires explicit confirmation',read('src/components/organization-launchpad-workspace.tsx').includes('I reviewed the proposed structure')&&read('src/components/organization-launchpad-workspace.tsx').includes('disabled={!confirmed')],
 ['Daily Brief service exists',exists('src/lib/opsiqo-one/daily-brief.ts')],
 ['Daily Brief consumes OPSIQO ONE overview',brief.includes('opsiqoOneOverview(actor)')],
 ['Daily Brief consumes permission-scoped notifications',brief.includes("actor.permissions.includes('notifications.read')")&&brief.includes('listNotifications(actor')],
 ['Daily Brief caps action items',brief.includes('.slice(0, 3)')],
 ['Daily Brief caps due-soon items',brief.includes('.slice(0, 2)')],
 ['Daily Brief states privacy boundary',brief.includes('does not create hidden employee risk scores')],
 ['Daily Brief API exists',exists('src/app/api/organizations/[orgId]/opsiqo-one/daily-brief/route.ts')],
 ['Daily Brief workspace exists',exists('src/components/daily-brief-workspace.tsx')&&exists('src/app/daily-brief/page.tsx')],
 ['Daily Brief has four-language presentation labels',['fr:','es:','ar:','en:'].every(x=>read('src/components/daily-brief-workspace.tsx').includes(x))],
 ['Adaptive navigation stores route metadata only',adaptive.includes('visits: Record<string, number>')&&adaptive.includes('recent: string[]')&&adaptive.includes('pinned: string[]')],
 ['Adaptive navigation has no HR-record storage terms',!adaptive.includes('workerId')&&!adaptive.includes('employeeId')&&!adaptive.includes('personId')&&!adaptive.includes('documentId')],
 ['Adaptive navigation supports pinned routes',adaptive.includes('toggleNavigationPin')],
 ['Adaptive navigation supports recent/frequent routes',adaptive.includes('recordNavigationVisit')&&adaptive.includes('suggestedNavigationHrefs')],
 ['Navigation fuzzy/semantic scoring exists',navIntel.includes('scoreNavigationMatch')&&navIntel.includes('rankNavigationItems')],
 ['Navigation search uses ranked intelligence',nav.includes('rankNavigationItems(visibleItems,normalizedQuery)')],
 ['Navigation exposes adaptive For you section',nav.includes('data-adaptive-navigation="true"')&&nav.includes('For you')],
 ['Navigation exposes pin/unpin controls',nav.includes("pinned?'Unpin':'Pin'")],
 ['Five primary outcomes remain unchanged',['Home','My Work','People','Intelligence','More'].every(x=>nav.includes(`>${x}</strong>`)||nav.includes(`shellText('${x}',shellLocale)`))],
 ['Product identity remains V7.14 or newer while retaining HCM v8.5',/v7\.(?:14|1[5-9]|[2-9]\d) · HCM v8\.5/.test(nav)],
 ['Multilingual AI foundation exists',exists('src/lib/opsiqo-one/multilingual-intelligence.ts')],
 ['AI question schema accepts controlled locale only',aiSchema.includes("z.enum(['auto','en','fr','es','ar'])")],
 ['AI prompt preserves evidence identifiers across languages',multilingual.includes('Preserve canonical evidence IDs')&&multilingual.includes('Do not translate an identifier')],
 ['AI service injects multilingual instruction',aiService.includes('aiLanguageInstruction(responseLocale)')],
 ['Ask OPSIQO uses signed-in user locale preference',commandRoute.includes('getSuperAppPreference(actor)')&&commandRoute.includes('responseLocale:preference.locale')],
 ['App-wide language bootstrap exists',exists('src/components/language-bootstrap.tsx')&&layout.includes('<LanguageBootstrap />')],
 ['Arabic locale sets RTL direction',read('src/components/language-bootstrap.tsx').includes("effective==='ar'?'rtl':'ltr'")],
 ['PWA service worker remains static-only for cache writes',sw.includes("const staticOnly=")&&sw.includes("if(url.pathname.startsWith('/api/'))return")],
 ['PWA never caches authenticated navigations',(()=>{const a=sw.indexOf("request.mode==='navigate'"),b=sw.indexOf('const staticOnly=',a);return a>=0&&b>a&&!sw.slice(a,b).includes('cache.put')})()],
 ['Offline privacy notice exists',exists('public/offline.html')&&read('public/offline.html').includes('does not cache employee records')],
 ['Connectivity banner explicitly states no cached HR data',read('src/components/connectivity-banner.tsx').includes('does not cache employee, payroll, document, or API data')],
 ['App shell renders connectivity status',appShell.includes('<ConnectivityBanner />')],
 ['Global mobile outcome navigation preserves the five outcome model',exists('src/components/mobile-outcome-nav.tsx')&&appShell.includes('<MobileOutcomeNav />')&&['Home','My Work','People','Intelligence','More'].every(x=>read('src/components/mobile-outcome-nav.tsx').includes(x))],
 ['Manifest identifies OPSIQO ONE and Daily Brief shortcut',manifest.includes("name:'OPSIQO ONE'")&&manifest.includes("name:'Daily Brief'")],
 ['Ask OPSIQO routes Organization Launchpad',router.includes("href:'/organization-launchpad'")],
 ['Ask OPSIQO routes Daily Brief',router.includes("href:'/daily-brief'")],
 ['Consequential action guard remains before normal routing',router.indexOf('blockedConsequential')<router.indexOf('const patterns')],
 ['V7.14 workspaces remain behind existing primary surfaces',more.includes('Daily Brief')&&more.includes('Organization Launchpad')],
 ['Existing V7.13 Agent Builder preserved',exists('src/lib/opsiqo-one/agent-builder.ts')&&exists('src/app/agent-builder/page.tsx')],
 ['Existing V7.13 Organizational Memory preserved',exists('src/lib/opsiqo-one/organizational-memory.ts')&&exists('src/app/organizational-memory/page.tsx')],
 ['Existing V7.13 Policy Intelligence preserved',exists('src/lib/opsiqo-one/policy-intelligence.ts')&&exists('src/app/policy-intelligence/page.tsx')],
 ['Existing V7.13 Automation Marketplace preserved',exists('src/lib/opsiqo-one/automation-marketplace.ts')&&exists('src/app/automation-marketplace/page.tsx')],
];
let fail=0;for(const[name,ok]of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++;}console.log(`\nOPSIQO ONE V7.14 Launchpad/Adaptive/Mobile Intelligence audit: ${checks.length-fail}/${checks.length} PASS`);if(fail)process.exit(1);
