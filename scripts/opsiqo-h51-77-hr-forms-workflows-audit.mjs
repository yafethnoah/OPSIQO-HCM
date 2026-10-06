import fs from 'node:fs';
const required=[
  'src/app/hr-forms/page.tsx',
  'src/components/hr-forms-workspace.tsx',
  'src/lib/hr-forms-workflows/opsiqo-service.ts',
  'src/lib/hr-forms-workflows/schemas.ts',
  'src/lib/hr-forms-workflows/docx.ts',
  'src/app/api/organizations/[orgId]/hr-forms/templates/route.ts',
  'src/app/api/organizations/[orgId]/hr-forms/dashboard/route.ts',
  'src/app/api/organizations/[orgId]/hr-forms/ai/generate/route.ts',
  'src/app/api/organizations/[orgId]/hr-forms/recruiting/interview-template/route.ts',
  'tests/h51-77-hr-forms-workflows.test.ts'
];
for(const p of required)if(!fs.existsSync(p))throw new Error(`H51.77 missing ${p}`);
const nav=fs.readFileSync('src/components/nav.tsx','utf8');
if(!nav.includes("href:'/hr-forms'"))throw new Error('H51.77 navigation entry missing.');
const rules=fs.readFileSync('firestore.rules','utf8');
for(const c of ['hrFormTemplates','hrFormInstances','hrFormSubmissions','hrFormPacks'])if(!rules.includes(`match /${c}/{docId} { allow read, write: if false; }`))throw new Error(`H51.77 Firestore server-owned rule missing: ${c}`);
const service=fs.readFileSync('src/lib/hr-forms-workflows/opsiqo-service.ts','utf8');
for(const marker of ['buildAudit','startWorkflowFromDefinition','generateAiAnswer','buildFillablePdf','buildSimpleDocx','MISSING ORGANIZATIONAL SOURCE'])if(!service.includes(marker))throw new Error(`H51.77 integration marker missing: ${marker}`);
console.log('OPSIQO H51.77 HR FORMS WORKFLOWS AUDIT: PASS');
