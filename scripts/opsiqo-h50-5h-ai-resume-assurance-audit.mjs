import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'),fail=[];
const must=(s,v,l)=>{if(!s.includes(v))fail.push(l+': '+v)};
const provider=read('src/lib/recruiting/ats-provider.ts');
const assurance=read('src/lib/recruiting/resume-assurance.ts');
const portal=read('src/components/candidate-application-portal.tsx');
const service=read('src/lib/recruiting/candidate-portal-service.ts');
for(const v of ['PASS 1 - candidate-focused resume extraction','PASS 2 - independently verify and correct','RECRUITING_RESUME_PARSE_V4_ASSURANCE','overallTrust'])must(provider,v,'provider');
for(const v of ['GENERIC_IDENTITY','GENERIC_EMAIL','filenameNameHint','Governed AI verification was unavailable'])must(assurance,v,'assurance');
for(const v of ['Machine parse trust','100% candidate-verified','I reviewed every parsed resume section','Machine parsing is never represented as 100% certain'])must(portal,v,'portal');
for(const v of ['machineTrust','aiVerified','requiresCandidateReview'])must(service,v,'service');
if(fail.length){console.error(JSON.stringify({status:'FAIL',fail},null,2));process.exit(1)}
console.log(JSON.stringify({status:'PASS',scope:'H50.5H AI resume parsing assurance'},null,2));
