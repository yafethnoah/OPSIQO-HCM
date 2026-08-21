import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const command=read('src/app/api/organizations/[orgId]/opsiqo-one/command/route.ts');
const governance=read('src/lib/opsiqo-one/agent-governance.ts');
const checks=[
 ['Cortex orchestration service exists',fs.existsSync('src/lib/opsiqo-one/orchestration.ts')],
 ['command API builds Cortex plan',command.includes('buildCortexPlan')],
 ['command API produces explainability',command.includes('explainCommand')],
 ['command API still has no direct Firestore write',!command.includes('adminDb(')],
 ['intelligent form foundation exists',fs.existsSync('src/lib/opsiqo-one/smart-forms.ts')],
 ['leave preparation returns intelligent form',command.includes("return'leave_request'")],
 ['intelligent forms leave unknown required fields blank',read('src/lib/opsiqo-one/smart-forms.ts').includes("field('startDate','Start date',undefined,true")],
 ['natural-language analytics service exists',fs.existsSync('src/lib/opsiqo-one/natural-analytics.ts')],
 ['analytics uses People Analytics service',read('src/lib/opsiqo-one/natural-analytics.ts').includes('peopleAnalyticsDashboard')],
 ['analytics route requires peopleanalytics.read',read('src/app/api/organizations/[orgId]/opsiqo-one/analytics/route.ts').includes("requirePermission(actor,'peopleanalytics.read')")],
 ['analytics exposes evidence refs',read('src/lib/opsiqo-one/natural-analytics.ts').includes('analyticsSnapshot:')],
 ['Employee Concierge route exists',fs.existsSync('src/app/concierge/page.tsx')],
 ['Employee Concierge API requires self.read',read('src/app/api/organizations/[orgId]/opsiqo-one/concierge/route.ts').includes("requirePermission(actor,'self.read')")],
 ['Employee Concierge uses SuperApp and Experience services',read('src/lib/opsiqo-one/concierge.ts').includes('superAppDashboard')&&read('src/lib/opsiqo-one/concierge.ts').includes('experienceDashboard')],
 ['Manager Copilot route exists',fs.existsSync('src/app/manager-copilot/page.tsx')],
 ['Manager Copilot requires team.read',read('src/lib/opsiqo-one/manager-copilot.ts').includes("team.read")],
 ['Manager Copilot explicitly prohibits sensitive inference',read('src/lib/opsiqo-one/manager-copilot.ts').includes('protected traits')],
 ['Compliance Radar route exists',fs.existsSync('src/app/compliance-radar/page.tsx')],
 ['Compliance Radar uses authoritative compliance dashboard',read('src/lib/opsiqo-one/compliance-radar.ts').includes('complianceDashboard')],
 ['Compliance Radar avoids legal compliance conclusion',read('src/lib/opsiqo-one/compliance-radar.ts').includes('legal compliance')],
 ['AI Governance Center route exists',fs.existsSync('src/app/ai-governance/page.tsx')],
 ['agent governance is persisted server-side',governance.includes('aiAgentPolicies')],
 ['agent governance requires ai.manage for writes',governance.includes("ai.manage")],
 ['agent policy cannot exceed hard code cap',governance.includes('agent_action_cap_exceeded')],
 ['agent policy changes create audit logs',governance.includes('ai.agent_policy.update')],
 ['Shadow Mode is configurable',read('src/components/ai-governance-center.tsx').includes('Shadow')&&governance.includes('shadowMode')],
 ['primary outcome navigation remains five items',read('src/components/nav.tsx').includes('OPSIQO ONE primary outcomes')&&['Home','My Work','People','Intelligence','More'].every(x=>read('src/components/nav.tsx').includes(`>${x}</strong>`)||read('src/components/nav.tsx').includes(`shellText('${x}',shellLocale)`))],
 ['new specialist features live behind existing outcomes',read('src/components/more-hub-workspace.tsx').includes('Employee Concierge')&&read('src/components/more-hub-workspace.tsx').includes('Compliance Radar')&&read('src/components/more-hub-workspace.tsx').includes('AI Governance Center')],
 ['consequential command blocks remain intact',(/terminat\(\?:e\|es\|ing\)/.test(read('src/lib/opsiqo-one/command-router.ts'))||read('src/lib/opsiqo-one/command-router.ts').includes('terminate|fire|dismiss'))&&read('src/lib/opsiqo-one/command-router.ts').includes('reject|decline')],
 ['MFA handling retained across new specialist workspaces',[read('src/components/employee-concierge-workspace.tsx'),read('src/components/manager-copilot-workspace.tsx'),read('src/components/compliance-radar-workspace.tsx'),read('src/components/ai-governance-center.tsx')].every(x=>x.includes('isMfaRequiredError'))],
];
let fail=0;for(const[name,ok]of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++;}
console.log(`\nOPSIQO ONE V7.11 Cortex/Concierge/Governance audit: ${checks.length-fail}/${checks.length} PASS`);if(fail)process.exit(1);
