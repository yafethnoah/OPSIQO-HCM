import type {ParsedResumeProfile} from '@/domain/ats';
import {assessStructuredResume} from './resume-structure';

const GENERIC_IDENTITY=/^(?:hr|human resources|department|recruiting|recruitment|recruiter|hiring|talent|team|office|admin|administrator|manager|careers?|jobs?)$/i;
const GENERIC_EMAIL=/^(?:hr|jobs?|careers?|recruit(?:ing|ment)?|talent|info|admin|office|contact|hello|people|humanresources)$/i;

function clamp(n:number,min=0,max=100){return Math.max(min,Math.min(max,Math.round(n)))}
function compact(v:string){return v.toLowerCase().replace(/[^a-z0-9]+/g,'')}
function filenameNameHint(fileName:string,sourceText:string){
 const stem=fileName.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
 const tokens=stem.split(' ').filter(Boolean);
 const stop=tokens.findIndex(x=>/^(?:resume|cv|curriculum|cover|letter)$/i.test(x));
 const pool=(stop>1?tokens.slice(0,stop):tokens).slice(0,2);
 if(pool.length!==2||pool.some(x=>!/^[A-Za-zÀ-ÖØ-öø-ÿ'’.-]{2,50}$/.test(x)))return null;
 const src=compact(sourceText);
 if(!pool.every(x=>src.includes(compact(x))))return null;
 return{firstName:pool[0]!,lastName:pool[1]!,displayName:`${pool[0]} ${pool[1]}`};
}

export function resumeParseCoverage(profile:ParsedResumeProfile){
 const sr=profile.structuredResume;
 const assessment=sr?assessStructuredResume(sr,profile.sourceText||''):{quality:0,coverage:0,recordCount:0,issues:[],criticalIssues:[]};
 const identity=[profile.firstName&&profile.lastName?1:0,profile.email?1:0,profile.phone?1:0,profile.location?1:0,profile.headline?1:0].reduce((a,b)=>a+b,0);
 const structuredCount=assessment.recordCount;
 const legacyCount=[profile.summary,profile.skills?.length,profile.certifications?.length,profile.education?.length,profile.employers?.length,profile.jobTitles?.length].filter(Boolean).length;
 const meaningful=Boolean((identity>=1&&(structuredCount+legacyCount)>=1)||(structuredCount+legacyCount)>=3);
 const structuredQuality=Number(profile.structuredQuality??assessment.quality);
 const criticalIssues=profile.structuredCriticalIssues||assessment.criticalIssues;
 const prefillReady=Boolean(
   meaningful &&
   structuredCount>=1 &&
   structuredQuality>=60 &&
   criticalIssues.length===0
 );
 return{identitySignals:identity,sectionSignals:structuredCount+legacyCount,structuredRecords:structuredCount,structuredQuality,criticalIssues,meaningful,prefillReady};
}

export function applyResumeAssurance(profile:ParsedResumeProfile,input:{fileName:string;sourceText:string;aiUsed:boolean}){
 const warnings=[...(profile.warnings||[])];
 const unresolved=new Set(profile.unresolvedFields||[]);
 const confidence={...(profile.fieldConfidence||{})};
 let firstName=profile.firstName,lastName=profile.lastName,displayName=profile.displayName,email=profile.email,phone=profile.phone;
 let trust=Number.isFinite(Number(profile.parseTrust))?Number(profile.parseTrust):Number(profile.parseQuality||0);

 const genericName=Boolean((firstName&&GENERIC_IDENTITY.test(firstName.trim()))||(lastName&&GENERIC_IDENTITY.test(lastName.trim())));
 if(genericName){
   const hint=filenameNameHint(input.fileName,input.sourceText);
   warnings.push('A generic department/recruiting label was rejected as the candidate name.');
   unresolved.add('candidateName');
   if(hint){
     firstName=hint.firstName;lastName=hint.lastName;displayName=hint.displayName;
     confidence.firstName=Math.max(Number(confidence.firstName||0),70);
     confidence.lastName=Math.max(Number(confidence.lastName||0),70);
     warnings.push('Candidate name was recovered from a filename hint that was also found in the resume text; candidate verification is required.');
   }else{
     firstName=undefined;lastName=undefined;displayName=undefined;
   }
   trust=Math.min(trust||100,72);
 }

 if(email){
   const local=email.split('@')[0]||'';
   if(GENERIC_EMAIL.test(local)){
     warnings.push('A generic HR/recruiting mailbox was rejected as the candidate email.');
     unresolved.add('email');
     email=undefined;
     if(genericName){phone=undefined;unresolved.add('phone')}
     trust=Math.min(trust||100,68);
   }
 }

 for(const key of ['firstName','lastName','email'] as const){
   const value={firstName,lastName,email}[key];
   const c=Number(confidence[key]??100);
   if(value&&input.aiUsed&&c<55){
     warnings.push(`${key} was withheld because AI confidence was below the auto-fill threshold.`);
     unresolved.add(key);
     if(key==='firstName')firstName=undefined;
     if(key==='lastName')lastName=undefined;
     if(key==='email')email=undefined;
     trust=Math.min(trust||100,74);
   }
 }

 const structuredQuality=Number(profile.structuredQuality||0);
 if(structuredQuality>0&&structuredQuality<75){trust=Math.min(trust||100,structuredQuality);unresolved.add('structuredResume');warnings.push('Structured resume relationships require review because record quality is below the high-confidence threshold.');}
 for(const issue of profile.structuredCriticalIssues||[]){unresolved.add('structuredResume');warnings.push(issue);}

 if(!input.aiUsed){
   trust=Math.min(trust||Number(profile.parseQuality||0),69);
   unresolved.add('candidateReview');
   warnings.push('Governed AI verification was unavailable; deterministic parsing is treated as a draft only.');
 }

 if(!firstName||!lastName)unresolved.add('candidateName');
 if(!email)unresolved.add('email');

 return{
   ...profile,
   firstName,lastName,displayName,email,phone,
   parseTrust:clamp(trust||0),
   fieldConfidence:confidence,
   unresolvedFields:[...unresolved],
   warnings:[...new Set(warnings)].slice(0,80),
   aiVerified:Boolean(profile.aiVerified&&input.aiUsed),
 };
}
