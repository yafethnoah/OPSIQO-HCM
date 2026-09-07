import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const fail=[];
const must=(s,v,l)=>{if(!s.includes(v))fail.push(l+': '+v)};
const portal=read('src/components/candidate-application-portal.tsx');
const links=read('src/components/candidate-application-links-panel.tsx');
const svc=read('src/lib/recruiting/candidate-portal-service.ts');
const docs=read('src/components/candidate-submission-documents-panel.tsx');
for(const v of ['Resume review & edit','Professional experience','Add another resume section','Fit % remains grounded in the original uploaded resume evidence'])must(portal,v,'portal');
for(const v of ['Update active link & copy','Multiple active links detected.','Existing active link detected.','Reconcile duplicate links / expired links'])must(links,v,'links');
for(const v of ['candidateReviewedResume','editableResumeFromProfile','customResumeSections','editorVersion:\'H50.5G\''])must(svc,v,'service');
for(const v of ['Candidate-reviewed resume profile','immutable uploaded resume evidence'])must(docs,v,'documents');
if(fail.length){console.error(JSON.stringify({status:'FAIL',fail},null,2));process.exit(1)}
console.log(JSON.stringify({status:'PASS',scope:'H50.5G candidate resume editor + link lifecycle'},null,2));
