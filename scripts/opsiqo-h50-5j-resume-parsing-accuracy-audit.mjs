import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'),fail=[];const must=(s,v,l)=>{if(!s.includes(v))fail.push(l+': missing '+v)};const mustNot=(s,v,l)=>{if(s.includes(v))fail.push(l+': forbidden '+v)};
const activation=read('src/lib/ai-intelligence/activation.ts');
const structure=read('src/lib/recruiting/resume-structure.ts');
const provider=read('src/lib/recruiting/ats-provider.ts');
const service=read('src/lib/recruiting/ats-service.ts');
const portalService=read('src/lib/recruiting/candidate-portal-service.ts');
const portal=read('src/components/candidate-application-portal.tsx');
for(const v of ["code: 'RECRUITING_ATS'","code: 'RECRUITING_ATS_MODEL'",'recruitingLiveReady','recruitingParserVersion'])must(activation,v,'activation');
for(const v of ['deterministicStructuredResume','assessStructuredResume','mergeStructuredResume','DEGREE_HINT','INSTITUTION_HINT','ROLE_DESCRIPTOR','ACTION_SENTENCE','coLocated'])must(structure,v,'structure');
for(const v of ['RELATIONSHIP RULE','fieldOfStudy=Pharmaceutical Botany','institution=Voronezh State University','structuredAssessment','structuredQuality'])must(provider,v,'provider');
for(const v of ['prefillReady','resume_ai_parse_failed','resume_parse_insufficient','OPSIQO will not continue with blank candidate fields'])must(service,v,'ats-service');
for(const v of ['requireStructuredPrefill?: boolean','options.requireStructuredPrefill!==false&&!coverage.prefillReady','parseResumeFile(actor, file, { requireStructuredPrefill: false })'])must(service,v,'ats-service');
mustNot(portalService,"(profile?.jobTitles||[]).map((positionTitle:string,index:number)",'candidate-service');
for(const v of ['structuredQuality','structuredCoverage','structuredRecordCount','structuredIssues'])must(portalService,v,'candidate-service');
for(const v of ['function answers(','async function save(','export async function savePublicApplicationDraft(','export async function loadPublicApplicationDraft('])must(portalService,v,'candidate-service');
for(const v of ['Structured Record Quality','Machine Parse Trust','100% candidate-verified'])must(portal,v,'portal');
if(fail.length){console.error(JSON.stringify({status:'FAIL',fail},null,2));process.exit(1)}
console.log(JSON.stringify({status:'PASS',scope:'H50.5J recruiting AI readiness + semantic structured resume accuracy'},null,2));
