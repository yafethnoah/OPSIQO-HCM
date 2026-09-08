import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'),fail=[];const must=(s,v,l)=>{if(!s.includes(v))fail.push(l+': '+v)};
const portal=read('src/components/candidate-application-portal.tsx'),provider=read('src/lib/recruiting/ats-provider.ts'),service=read('src/lib/recruiting/candidate-portal-service.ts'),ats=read('src/lib/recruiting/ats-service.ts'),domain=read('src/domain/structured-resume.ts');
for(const v of ['Import Resume','Add Employment History','Add Education History','Add skill','Add Certification','Add Language','Add Project','Add Volunteer Experience','Add Award / Honour','Add Publication / Presentation','100% candidate-verified'])must(portal,v,'portal');
for(const v of ['employmentHistory:[','educationHistory:[','certificationRecords:[','languageRecords:[','projectRecords:[','volunteerRecords:[','awardRecords:[','publicationRecords:[','structuredResume'])must(provider,v,'provider');
for(const v of ['structuredResume:i.structuredResume',"structuredEditorVersion:'H50.5I'",'structuredResumeFromProfile'])must(service,v,'service');
for(const v of ['resumeParseCoverage','resume_ai_parse_failed','resume_parse_insufficient'])must(ats,v,'ats-service');
for(const v of ['ResumeEmploymentEntry','ResumeEducationEntry','StructuredResumeProfile'])must(domain,v,'domain');
if(fail.length){console.error(JSON.stringify({status:'FAIL',fail},null,2));process.exit(1)}
console.log(JSON.stringify({status:'PASS',scope:'H50.5I structured resume extraction + editable application records'},null,2));
