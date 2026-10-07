import fs from 'node:fs';

const files=[
  'src/components/experience-workspace.tsx',
  'src/components/employee-service-center-workspace.tsx',
  'src/components/intelligent-hr-request-composer.tsx',
  'src/lib/experience/self-service.ts',
  'src/lib/experience/evidence.ts',
  'src/lib/experience/intelligence.ts',
  'src/lib/experience/service.ts',
  'src/lib/ai-intelligence/evidence.ts',
  'src/domain/workflow.ts',
  'src/app/api/organizations/[orgId]/experience/self-service/route.ts',
  'src/app/api/organizations/[orgId]/experience/intelligence/route.ts',
  'src/app/api/organizations/[orgId]/experience/intelligence/action/route.ts',
];
for(const file of files)if(!fs.existsSync(file))throw new Error(`H51.82 missing ${file}`);

const experience=fs.readFileSync(files[0],'utf8');
const employee=fs.readFileSync(files[1],'utf8');
const composer=fs.readFileSync(files[2],'utf8');
const self=fs.readFileSync(files[3],'utf8');
const evidence=fs.readFileSync(files[4],'utf8');
const intelligence=fs.readFileSync(files[5],'utf8');
const service=fs.readFileSync(files[6],'utf8');
const aiEvidence=fs.readFileSync(files[7],'utf8');
const workflow=fs.readFileSync(files[8],'utf8');

if(/<select\b/.test(experience)||/<select\b/.test(employee)||/<select\b/.test(composer))throw new Error('Native select remains in Experience/Employee Service UI.');

for(const marker of [
  'IntelligentHrRequestComposer',
  "type Tab='overview'|'intelligence'",
  'No prompt needed.',
  'Create governed action plan',
  'Self-service deflection',
])if(!experience.includes(marker))throw new Error(`Experience UI marker missing: ${marker}`);

for(const marker of [
  'Find answer & prepare request',
  'This answered my question',
  'Still need HR — submit request',
  'OpsiqoSelect',
])if(!composer.includes(marker))throw new Error(`Self-service composer marker missing: ${marker}`);

for(const marker of [
  'scoreKnowledgeArticles',
  'computeServiceTriage',
  'serviceSelfServiceSessions',
  "outcome:'resolved_without_ticket'",
  "outcome:'escalated_to_ticket'",
])if(!self.includes(marker))throw new Error(`Self-service backend marker missing: ${marker}`);

for(const marker of [
  'Privacy boundary: no raw ticket descriptions',
  'retrieveExperienceAiEvidence',
  'processExperienceSignalGovernance',
  'experience.signal_detected',
  'selfServiceDeflectionPct',
])if(!evidence.includes(marker))throw new Error(`Experience evidence marker missing: ${marker}`);

for(const marker of [
  'automaticPrompt',
  "promptWrittenBy:'OPSIQO'",
  'askCopilot',
  'createActionPlan',
  'requiresHumanReview:true',
])if(!intelligence.includes(marker))throw new Error(`Experience intelligence marker missing: ${marker}`);

for(const marker of [
  'computeServiceTriage',
  'routingRole:triage.routingRole',
  'triageConfidence',
  'processExperienceSignalGovernance',
])if(!service.includes(marker))throw new Error(`Experience service marker missing: ${marker}`);

if(!aiEvidence.includes('retrieveExperienceAiEvidence'))throw new Error('HR Copilot does not include Experience evidence.');
if(!workflow.includes("'experience.signal_detected'"))throw new Error('Experience signal workflow trigger missing.');

console.log('OPSIQO H51.82 INTELLIGENT EXPERIENCE AUDIT: PASS');
