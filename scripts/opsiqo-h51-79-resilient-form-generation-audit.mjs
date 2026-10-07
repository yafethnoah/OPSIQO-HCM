import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const required=[
  'src/lib/ai-intelligence/provider.ts',
  'src/lib/hr-forms-workflows/studio-service.ts',
  'src/lib/hr-forms-workflows/studio-schemas.ts',
  'src/components/hr-forms-workspace.tsx',
  'src/app/api/organizations/[orgId]/hr-forms/studio/enhance/route.ts',
  'src/app/api/organizations/[orgId]/hr-forms/packs/[packId]/export/route.ts',
  'tests/h51-79-resilient-form-generation.test.ts'
];
for(const p of required)if(!fs.existsSync(p))throw new Error(`H51.79 missing ${p}`);
const provider=read('src/lib/ai-intelligence/provider.ts');
for(const m of ['geminiVertex','geminiApiKey','aiplatform.googleapis.com','OPSIQO_GEMINI_TRANSPORT','OPSIQO_RECRUITING_GEMINI_TRANSPORT','AI enhancement is temporarily unavailable.'])if(!provider.includes(m))throw new Error(`H51.79 provider marker missing: ${m}`);
const service=read('src/lib/hr-forms-workflows/studio-service.ts');
for(const m of ["requireStudio(actor);","enhancementStatus:'completed'|'unavailable'|'skipped'","safeEnhancementWarning","export async function enhanceStudioArtifacts","export async function exportFormPack","studioVersion:'H51.79'"])if(!service.includes(m))throw new Error(`H51.79 service marker missing: ${m}`);
const route=read('src/app/api/organizations/[orgId]/hr-forms/studio/generate/route.ts');
if(route.includes("requirePermission(a,'ai.use')"))throw new Error('H51.79 deterministic generation must not require ai.use.');
const ui=read('src/components/hr-forms-workspace.tsx');
for(const m of ['Download complete pack PDF','Retry AI enhancement',"background:intent===i.id?'#123f48':'#ffffff'",'AI enhancement is optional'])if(!ui.includes(m))throw new Error(`H51.79 UI marker missing: ${m}`);
if(ui.includes("['advanced','Advanced Editor']"))throw new Error('Advanced Editor remains over-emphasized in primary navigation.');
console.log('OPSIQO H51.79 RESILIENT INTELLIGENT FORM GENERATION AUDIT: PASS');
