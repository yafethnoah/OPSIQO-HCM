import fs from 'node:fs';

const mustExist=[
  'src/lib/hr-forms-workflows/studio-schemas.ts',
  'src/lib/hr-forms-workflows/studio-service.ts',
  'src/lib/hr-forms-workflows/professional-blueprints.ts',
  'src/components/hr-form-document-preview.tsx',
  'src/components/hr-forms-workspace.tsx',
  'src/app/api/organizations/[orgId]/hr-forms/studio/options/route.ts',
  'src/app/api/organizations/[orgId]/hr-forms/studio/generate/route.ts',
  'src/app/api/organizations/[orgId]/hr-forms/templates/[templateId]/export/route.ts',
  'tests/h51-78-intelligent-form-studio.test.ts'
];
for(const p of mustExist)if(!fs.existsSync(p))throw new Error(`H51.78 missing ${p}`);

const schemas=fs.readFileSync('src/lib/hr-forms-workflows/studio-schemas.ts','utf8');
if(schemas.includes('prompt:'))throw new Error('H51.78 client generation schema must not accept prompt.');
if(!schemas.includes('.strict()'))throw new Error('H51.78 Studio generation schema must be strict.');

const service=fs.readFileSync('src/lib/hr-forms-workflows/studio-service.ts','utf8');
for(const marker of ['buildAutomaticPrompt','promptWrittenBy:\'OPSIQO\'','automaticPromptHash','discoverSupportingEvidence','generateAiAnswer','hrFormPacks'])if(!service.includes(marker))throw new Error(`H51.78 service marker missing: ${marker}`);

const ui=fs.readFileSync('src/components/hr-forms-workspace.tsx','utf8');
for(const marker of ['No prompt needed.','Generate complete form pack','Professional document preview','Advanced Editor','HrFormDocumentPreview'])if(!ui.includes(marker))throw new Error(`H51.78 UX marker missing: ${marker}`);
if(ui.includes('Source record ID')||ui.includes('name="prompt"'))throw new Error('H51.78 primary UX still exposes technical prompt/source-ID fields.');

const blueprint=fs.readFileSync('src/lib/hr-forms-workflows/professional-blueprints.ts','utf8');
for(const title of ['Employee Information Form','Structured Interview Evaluation Form','New Hire Orientation Checklist','Exit Interview Form','Workplace Incident / Hazard Report','Workplace Accommodation Request & Plan'])if(!blueprint.includes(title))throw new Error(`H51.78 professional blueprint missing: ${title}`);

console.log('OPSIQO H51.78 INTELLIGENT FORM STUDIO AUDIT: PASS');
