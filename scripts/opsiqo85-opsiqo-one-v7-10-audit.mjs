import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const checks=[
 ['authenticated shell includes persistent command center',read('src/components/app-shell.tsx').includes('<OpsiQoCommandBar />')],
 ['primary outcome navigation includes Home',(read('src/components/nav.tsx').includes('>Home</strong>')||read('src/components/nav.tsx').includes("shellText('Home',shellLocale)"))],
 ['primary outcome navigation includes My Work',(read('src/components/nav.tsx').includes('>My Work</strong>')||read('src/components/nav.tsx').includes("shellText('My Work',shellLocale)"))],
 ['primary outcome navigation includes People',(read('src/components/nav.tsx').includes('>People</strong>')||read('src/components/nav.tsx').includes("shellText('People',shellLocale)"))],
 ['primary outcome navigation includes Intelligence',(read('src/components/nav.tsx').includes('>Intelligence</strong>')||read('src/components/nav.tsx').includes("shellText('Intelligence',shellLocale)"))],
 ['primary outcome navigation includes More',(read('src/components/nav.tsx').includes('>More</strong>')||read('src/components/nav.tsx').includes("shellText('More',shellLocale)"))],
 ['Home limits My Day to top five',read('src/components/superapp-workspace.tsx').includes('d.attention.slice(0,5)')],
 ['universal My Work route exists',fs.existsSync('src/app/my-work/page.tsx')],
 ['Intelligence hub route exists',fs.existsSync('src/app/intelligence/page.tsx')],
 ['More hub route exists',fs.existsSync('src/app/more/page.tsx')],
 ['Cortex agent registry exists',fs.existsSync('src/lib/opsiqo-one/cortex.ts')],
 ['knowledge graph foundation exists',fs.existsSync('src/lib/opsiqo-one/knowledge-graph.ts')],
 ['knowledge graph excludes sensitive HR fields by design',read('src/lib/opsiqo-one/knowledge-graph.ts').includes('private contact, compensation, health, case')],
 ['command router blocks termination',(/terminat\(\?:e\|es\|ing\)/.test(read('src/lib/opsiqo-one/command-router.ts'))||read('src/lib/opsiqo-one/command-router.ts').includes('terminate|fire|dismiss'))],
 ['command router blocks candidate rejection',read('src/lib/opsiqo-one/command-router.ts').includes('reject|decline')],
 ['command route uses existing governed AI service',read('src/app/api/organizations/[orgId]/opsiqo-one/command/route.ts').includes('askCopilot')],
 ['command route has no Firestore direct write',!read('src/app/api/organizations/[orgId]/opsiqo-one/command/route.ts').includes('adminDb(')],
 ['overview requires self permission',read('src/app/api/organizations/[orgId]/opsiqo-one/overview/route.ts').includes("requirePermission(actor,'self.read')")],
 ['action safety model includes four levels',['observe','recommend','prepare','execute'].every(x=>read('src/lib/opsiqo-one/cortex.ts').includes(`level:'${x}'`))],
 ['MFA handling retained in command UX',read('src/components/opsiqo-command-bar.tsx').includes('isMfaRequiredError')],
 ['MFA handling retained in My Work',read('src/components/my-work-workspace.tsx').includes('isMfaRequiredError')],
];
let fail=0;for(const[name,ok]of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++;}
console.log(`\nOPSIQO ONE V7.10 foundation audit: ${checks.length-fail}/${checks.length} PASS`);if(fail)process.exit(1);
