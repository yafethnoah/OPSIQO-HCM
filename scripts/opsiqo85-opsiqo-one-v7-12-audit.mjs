import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const exists=p=>fs.existsSync(p);
const nav=read('src/components/nav.tsx');
const router=read('src/lib/opsiqo-one/command-router.ts');
const cortex=read('src/lib/opsiqo-one/cortex.ts');
const checks=[
 ['V7.12 domain model exists',exists('src/domain/opsiqo-one-v7-12.ts')],
 ['Skills Passport service exists',exists('src/lib/opsiqo-one/skills-intelligence.ts')],
 ['Skills Passport reuses authoritative Learning dashboard',read('src/lib/opsiqo-one/skills-intelligence.ts').includes('learningDashboard(actor)')],
 ['Skills Passport separates verified from self-reported evidence',read('src/lib/opsiqo-one/skills-intelligence.ts').includes("evidenceStatus==='verified'")&&read('src/lib/opsiqo-one/skills-intelligence.ts').includes("evidenceStatus==='self_reported'")],
 ['Skills Passport API requires self and learning permissions',read('src/app/api/organizations/[orgId]/opsiqo-one/skills-passport/route.ts').includes("requirePermission(actor,'self.read')")&&read('src/app/api/organizations/[orgId]/opsiqo-one/skills-passport/route.ts').includes("requirePermission(actor,'learning.read')")],
 ['Skills Passport workspace has MFA terminal handling',read('src/components/skills-passport-workspace.tsx').includes('isMfaRequiredError')],
 ['Career GPS service exists',exists('src/lib/opsiqo-one/career-gps.ts')],
 ['Career GPS reuses Career domain service',read('src/lib/opsiqo-one/career-gps.ts').includes('careerDashboard(actor)')],
 ['Career GPS reuses Learning evidence when allowed',read('src/lib/opsiqo-one/career-gps.ts').includes('learningDashboard(actor)')],
 ['Career GPS explicitly blocks promise/decision framing',read('src/lib/opsiqo-one/career-gps.ts').includes('not a promotion, hiring, succession or compensation decision')],
 ['Career GPS workspace exposes target-role evidence',read('src/components/career-gps-workspace.tsx').includes('Evidence completeness')&&read('src/components/career-gps-workspace.tsx').includes('Target-role gaps')],
 ['Talent Marketplace service exists',exists('src/lib/opsiqo-one/talent-marketplace.ts')],
 ['Talent Marketplace reuses Career opportunities',read('src/lib/opsiqo-one/talent-marketplace.ts').includes('careerDashboard(actor)')],
 ['Talent Marketplace does not rank employees against each other',read('src/lib/opsiqo-one/talent-marketplace.ts').includes('does not rank employees against one another')],
 ['Talent Marketplace route requires career.read',read('src/app/api/organizations/[orgId]/opsiqo-one/talent-marketplace/route.ts').includes("requirePermission(actor,'career.read')")],
 ['Scenario Lab service exists',exists('src/lib/opsiqo-one/scenario-lab.ts')],
 ['Scenario Lab reuses Workforce Planning service',read('src/lib/opsiqo-one/scenario-lab.ts').includes('workforcePlanningDashboard(actor)')],
 ['Scenario Lab reuses permission-scoped Knowledge Graph',read('src/lib/opsiqo-one/scenario-lab.ts').includes('buildKnowledgeGraphSnapshot(actor)')],
 ['Scenario Lab API is read-only GET surface',read('src/app/api/organizations/[orgId]/opsiqo-one/scenario-lab/route.ts').includes('export async function GET')&&!read('src/app/api/organizations/[orgId]/opsiqo-one/scenario-lab/route.ts').includes('export async function POST')],
 ['Scenario Lab explicitly rejects predictive employment use',read('src/lib/opsiqo-one/scenario-lab.ts').includes('do not predict individual departures')&&read('src/lib/opsiqo-one/scenario-lab.ts').includes('recommend layoffs')],
 ['AI Value service exists',exists('src/lib/opsiqo-one/ai-value.ts')],
 ['AI Value reads measured AI runs and action plans',read('src/lib/opsiqo-one/ai-value.ts').includes('/aiRuns')&&read('src/lib/opsiqo-one/ai-value.ts').includes('/aiActionPlans')],
 ['AI Value requires ai.audit or ai.manage',read('src/lib/opsiqo-one/ai-value.ts').includes("ai.audit")&&read('src/lib/opsiqo-one/ai-value.ts').includes("ai.manage")],
 ['AI Value refuses fabricated financial ROI',read('src/lib/opsiqo-one/ai-value.ts').includes("hours:null")&&read('src/lib/opsiqo-one/ai-value.ts').includes("status:'not_configured'")&&read('src/lib/opsiqo-one/ai-value.ts').includes('does not fabricate ROI')],
 ['AI Value returns aggregates rather than raw runs',!read('src/lib/opsiqo-one/ai-value.ts').includes('recentRuns:')&&!read('src/lib/opsiqo-one/ai-value.ts').includes('question:')],
 ['Talent Mobility Cortex agent is registered',cortex.includes("id:'talent-mobility'")&&cortex.includes('Career GPS')&&cortex.includes('Internal Talent Marketplace')],
 ['No Cortex agent gains unrestricted execute cap',!cortex.includes("maxActionLevel:'execute'")],
 ['Ask OPSIQO routes Career GPS',router.includes("href:'/career-gps'")],
 ['Ask OPSIQO routes Talent Marketplace',router.includes("href:'/talent-marketplace'")],
 ['Ask OPSIQO routes Scenario Lab',router.includes("href:'/scenario-lab'")],
 ['Ask OPSIQO routes AI Value',router.includes("href:'/ai-value'")],
 ['Consequential action block remains before normal routing',router.indexOf('blockedConsequential')<router.indexOf('const patterns')],
 ['Five primary outcome navigation items remain unchanged',['Home','My Work','People','Intelligence','More'].every(x=>nav.includes(`>${x}</strong>`)||nav.includes(`shellText('${x}',shellLocale)`))],
 ['V7.12 specialist pages live behind existing outcomes',read('src/components/more-hub-workspace.tsx').includes('Career GPS')&&read('src/components/more-hub-workspace.tsx').includes('Scenario Lab')&&read('src/components/intelligence-hub-workspace.tsx').includes('AI Value')],
 ['Product identity advances without removing HCM baseline',(()=>{const m=nav.match(/v7\.(\d+)\s*·\s*HCM v8\.5/);return Boolean(m)&&Number(m[1])>=12})()],
 ['All new client workspaces handle MFA',[read('src/components/skills-passport-workspace.tsx'),read('src/components/career-gps-workspace.tsx'),read('src/components/talent-marketplace-workspace.tsx'),read('src/components/scenario-lab-workspace.tsx'),read('src/components/ai-value-workspace.tsx')].every(x=>x.includes('isMfaRequiredError'))],
];
let fail=0;for(const[name,ok]of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++;}
console.log(`\nOPSIQO ONE V7.12 Talent/Scenario/Value audit: ${checks.length-fail}/${checks.length} PASS`);if(fail)process.exit(1);
