import { readFileSync, existsSync } from 'node:fs';
const read=(p)=>readFileSync(p,'utf8');
const nav=read('src/components/nav.tsx');
const shell=read('src/components/app-shell.tsx');
const root=read('src/app/page.tsx');
const css=read('src/app/globals.css');
const hrefs=[...nav.matchAll(/href:'([^']+)'/g)].map(m=>m[1]);
const duplicates=hrefs.filter((x,i)=>hrefs.indexOf(x)!==i);
const missing=hrefs.filter(h=>!existsSync(`src/app${h}/page.tsx`));
const checks=[
 ['Home is the first navigation destination',nav.indexOf("label:'Home'")>=0&&nav.indexOf("label:'Home'")<nav.indexOf("label:'HR Overview'")],
 ['Root route redirects to Home',/redirect\('\/home'\)/.test(root)],
 ['navigation has Start section',/area:'home', label:'Start'/.test(nav)],
 ['navigation has People section',/area:'people', label:'People'/.test(nav)],
 ['navigation has Talent & Work section',/area:'work', label:'Talent & Work'/.test(nav)],
 ['navigation has Insights section',/area:'insights', label:'Insights'/.test(nav)],
 ['navigation has More section',/area:'more', label:'More', defaultClosed:true/.test(nav)],
 ['navigation has Admin & Platform section',/area:'admin', label:'Admin & Platform', defaultClosed:true/.test(nav)],
 ['advanced sections are collapsed by default',/groupDefinitions\.filter\(g=>g\.defaultClosed\)/.test(nav)],
 ['permission-aware navigation finder exists',/className="navFinderInput"/.test(nav)&&/type="search"/.test(nav)],
 ['navigation remains permission aware',/permissions\.includes\(item\.permission\)/.test(nav)],
 ['active page uses aria-current',/aria-current=\{active\?'page':undefined\}/.test(nav)],
 ['brand returns to Home',/<Link href="\/home" className="brand"/.test(nav)],
 ['skip-to-main link exists',/Skip to main content/.test(shell)],
 ['main content has stable target id',/id="main-content"/.test(shell)],
 ['main content is focusable',/tabIndex=\{-1\}/.test(shell)],
 ['skip-link CSS exists',/\.skipLink/.test(css)],
 ['navigation finder focus state exists',/\.navFinderInput:focus/.test(css)],
 ['all literal nav routes have pages',missing.length===0],
 ['no duplicate literal navigation routes',duplicates.length===0],
 ['Employee Portal remains directly available',/href:'\/employee',permission:'self\.read'/.test(nav)],
 ['My Team remains permission scoped',/href:'\/manager',permission:'team\.read'/.test(nav)],
 ['Settings remains available',/href:'\/settings'/.test(nav)],
 ['AI HR Copilot remains permission scoped',/href:'\/ai-copilot',permission:'ai\.use'/.test(nav)],
 ['search clears after navigation',/onClick=\{\(\)=>setQuery\(''\)\}/.test(nav)],
];
for(const [label,ok] of checks)console.log(`${ok?'PASS':'FAIL'}  ${label}`);
if(missing.length)console.log('Missing nav pages:',missing);
if(duplicates.length)console.log('Duplicate nav routes:',duplicates);
const failures=checks.filter(([,ok])=>!ok).length;
console.log(JSON.stringify({status:failures?'FAIL':'PASS',checks:checks.length,failures,navRoutes:hrefs.length},null,2));
if(failures)process.exitCode=1;
