import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const required=[
  'src/components/hr-forms-operational-workspace.tsx',
  'src/components/hr-form-fill-workspace.tsx',
  'src/components/hr-form-document-preview.tsx',
  'src/app/api/organizations/[orgId]/hr-forms/packs/route.ts',
  'src/app/api/organizations/[orgId]/hr-forms/packs/[packId]/route.ts',
  'src/app/api/organizations/[orgId]/hr-forms/packs/[packId]/start/route.ts',
  'src/app/api/organizations/[orgId]/hr-forms/instances/[instanceId]/route.ts',
  'tests/h51-80-operational-forms.test.ts'
];
for(const p of required)if(!fs.existsSync(p))throw new Error(`H51.80 missing ${p}`);

const page=read('src/app/hr-forms/page.tsx');
if(!page.includes('HrFormsOperationalWorkspace'))throw new Error('H51.80 page is not using the operational workspace.');

const studio=read('src/lib/hr-forms-workflows/studio-service.ts');
for(const m of ['nextFormCode','reviewGuidanceFromAnswer','getFormPackWorkspace','actOnFormPack','startFormPack','buildFillablePdfPack','hrFormCounters'])if(!studio.includes(m))throw new Error(`H51.80 Studio marker missing: ${m}`);
if(studio.includes("clean.push({id:'ai_review_guidance'"))throw new Error('AI review guidance is still being injected into operational form fields.');

const ops=read('src/lib/hr-forms-workflows/opsiqo-service.ts');
if(!ops.includes("if(current.status!=='under_review')"))throw new Error('H51.80 strict approval lifecycle is not enforced.');
for(const m of ['getFormInstance','listFormInstances','instance.packId'])if(!ops.includes(m))throw new Error(`H51.80 instance marker missing: ${m}`);

const preview=read('src/components/hr-form-document-preview.tsx');
if(!preview.includes("f.id!=='ai_review_guidance'"))throw new Error('H51.80 preview does not exclude AI guidance.');
if(!preview.includes('brand?.logoUrl'))throw new Error('H51.80 digital preview does not use tenant logo.');

const workspace=read('src/components/hr-forms-operational-workspace.tsx');
for(const m of ['OPSIQO Review Panel','Start / Fill Form','Form Packs','Manage lifecycle in pack workspace','More ⋯'])if(!workspace.includes(m))throw new Error(`H51.80 UX marker missing: ${m}`);
if(workspace.includes("selected.status==='draft'?<button className=\"button secondary\"")&&workspace.includes("selected.status==='under_review'?<button"))throw new Error('Review lifecycle primary action styling did not update.');

const pdf=read('src/lib/documents/fillable-pdf.ts');
if(!pdf.includes('export function buildFillablePdfPack'))throw new Error('H51.80 fillable pack PDF builder missing.');

const rules=read('firestore.rules');
if(!rules.includes('match /hrFormCounters/{docId} { allow read, write: if false; }'))throw new Error('H51.80 counter collection is not fail-closed.');

console.log('OPSIQO H51.80 OPERATIONAL FORMS & PACK WORKSPACE AUDIT: PASS');
