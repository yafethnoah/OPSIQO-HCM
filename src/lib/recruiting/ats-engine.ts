import { createHash } from 'node:crypto';
import type { Candidate, Requisition } from '@/domain/recruiting';
import type { AtsEvidenceMatch, AtsResumeReview, CoverLetterReview, ParsedResumeProfile } from '@/domain/ats';

export const ATS_SCORING_VERSION = 'OPSIQO_ATS_JOB_RELEVANCE_V2';
const PROTECTED = new Set(['age','aged','young','younger','older','gender','male','female','woman','women','man','men','race','racial','religion','religious','faith','disability','disabled','marital','married','pregnant','pregnancy','ethnicity','ethnic','nationality','citizen','citizenship','sexual','orientation','veteran']);
const SENSITIVE_CRITERION = /\b(?:age|aged|young(?:er)?|older|gender|male|female|women?|men?|race|racial|religion|religious|faith|disability|disabled|marital|married|pregnan(?:t|cy)|ethnicity|ethnic|nationality|citizen(?:ship)?|sexual\s+orientation|veteran)\b/i;
const containsSensitiveCriterion=(s:string)=>SENSITIVE_CRITERION.test(s);
const safeJobDescription=(s:string)=>s.split(/\r?\n|(?<=[.!?])\s+/).filter(part=>!containsSensitiveCriterion(part)).join('\n');
const STOP = new Set(['a','an','of','to','in','on','as','at','by','or','is','be','the','and','for','with','that','this','from','you','your','our','are','will','have','has','had','into','their','they','them','who','but','not','all','any','can','may','must','should','required','preferred','work','working','role','job','position','candidate','experience','years','year','skills','skill','responsibilities','responsibility','requirements','requirement','qualifications','qualification','duties','duty','description','ability','including','such','other','using','use','within','about','more','minimum','strong','excellent','knowledge']);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const norm=(s:string)=>s.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9+#./-]+/g,' ').replace(/\s+/g,' ').trim();
const terms=(s:string)=>norm(s).split(' ').map(x=>x.replace(/[.]+$/g,'')).filter(x=>x.length>=2&&!STOP.has(x)&&!PROTECTED.has(x));
const unique=<T,>(a:T[])=>[...new Set(a)];

function snippet(text:string, needle:string){const n=norm(needle);const words=terms(n).slice(0,5);const lower=norm(text);let idx=-1;for(const w of words){idx=lower.indexOf(w);if(idx>=0)break}if(idx<0)return undefined;const rawIdx=Math.min(text.length-1,Math.max(0,Math.floor(idx/Math.max(1,lower.length)*text.length)));return text.slice(Math.max(0,rawIdx-120),Math.min(text.length,rawIdx+300)).replace(/\s+/g,' ').trim();}
function requirementMatch(resume:string,criterion:string){const r=terms(resume),set=new Set(r),hasYearRequirement=explicitYears(criterion)!=null,c=unique(terms(criterion).filter(x=>!(hasYearRequirement&&/^\d+$/.test(x))));if(!c.length)return{score:0,missing:[] as string[]};const matched=c.filter(x=>set.has(x));const score=matched.length/c.length;return{score,missing:c.filter(x=>!set.has(x))};}
function topJobKeywords(req:Requisition){const safeRequirements=(req.requirements||[]).filter(x=>!containsSensitiveCriterion(x));const text=[req.title,safeJobDescription(req.description||''),...safeRequirements].join(' '),freq=new Map<string,number>();for(const t of terms(text))freq.set(t,(freq.get(t)||0)+1);return[...freq.entries()].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length).map(x=>x[0]).filter(x=>!PROTECTED.has(x[0])).slice(0,40);}
function explicitYears(s:string){const vals=[...s.matchAll(/(?:minimum\s+|at least\s+)?(\d{1,2})\+?\s*(?:years?|yrs?)\b/gi)].map(m=>Number(m[1])).filter(Number.isFinite);return vals.length?Math.max(...vals):undefined;}
function educationSignals(s:string){return unique((s.match(/\b(?:bachelor(?:'s)?|master(?:'s)?|phd|doctorate|diploma|degree|certificate|certification|cpa|chrl|chrp|pmp|shrm(?:-cp|-scp)?|cphr|cfa|mba)\b/gi)||[]).map(norm));}
function percent(n:number){return Math.max(0,Math.min(100,Math.round(n)));}

function candidateNameFromFileName(fileName?:string){
 if(!fileName)return undefined;
 let base=fileName.split(/[\\/]/).pop()||'';
 base=base.replace(/\.[A-Za-z0-9]{1,8}$/,'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').replace(/\b(?:resume|curriculum\s+vitae|cv|profile|candidate|application)\b/gi,' ').replace(/\b\d{4,}\b/g,' ').replace(/\s+/g,' ').trim();
 return plausiblePersonName(base)?base:undefined;
}
const NON_NAME_LINE=/\b(?:resume|curriculum\s+vitae|professional\s+summary|summary|profile|skills?|experience|employment|education|certifications?|competencies|expertise|linkedin|portfolio|github|marketing|specialist|manager|director|engineer|analyst|developer|consultant|coordinator|assistant|executive|administrator|officer)\b/i;
function plausiblePersonName(value:string){
 const clean=value.replace(/[•|]+/g,' ').replace(/\s+/g,' ').trim();
 if(clean.length<3||clean.length>100||/@|https?:\/\/|www\.|\d/.test(clean)||NON_NAME_LINE.test(clean))return false;
 const tokens=clean.split(/\s+/).filter(Boolean);
 if(tokens.length<2||tokens.length>5)return false;
 return tokens.every(token=>/^[\p{L}][\p{L}'’.-]*$/u.test(token));
}
function candidateNameFromLines(lines:string[]){
 const labeled=lines.slice(0,30).map(line=>/^(?:candidate\s+)?name\s*[:\-]\s*(.+)$/i.exec(line)?.[1]?.trim()).find((value):value is string=>Boolean(value&&plausiblePersonName(value)));
 if(labeled)return labeled;
 let best:{value:string;score:number}|undefined;
 for(let i=0;i<Math.min(lines.length,24);i++){
  const value=lines[i]!.replace(/^[•*\-]+\s*/,'').trim();
  if(!plausiblePersonName(value))continue;
  const tokens=value.split(/\s+/);
  let score=40-Math.min(30,i*3);
  if(i===0)score+=25;
  if(tokens.every(token=>/^\p{Lu}/u.test(token)))score+=10;
  if(tokens.length===2||tokens.length===3)score+=8;
  if(!best||score>best.score)best={value,score};
 }
 return best?.value;
}
function normalizedLinkedIn(sourceText:string){
 const raw=(sourceText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[^\s)>,]+/i)||[])[0];
 if(!raw)return undefined;
 return /^https?:\/\//i.test(raw)?raw:`https://${raw}`;
}
function labeledLocation(sourceText:string){
 const raw=/^(?:location|based\s+in|address)\s*[:\-]\s*(.+)$/im.exec(sourceText)?.[1]?.trim();
 if(!raw||raw.length>180||/@|https?:\/\//i.test(raw))return undefined;
 return raw;
}

export function parseResumeTextDeterministic(text:string,fileName?:string):ParsedResumeProfile{
 const sourceText=text.replace(/\u0000/g,'').trim().slice(0,500000),lines=sourceText.split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
 const labeledName=candidateNameFromLines(lines),fileNameName=candidateNameFromFileName(fileName),displayName=labeledName||fileNameName;
 const email=(sourceText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]?.trim();
 const phone=(sourceText.match(/(?:\+?\d[\d .()-]{7,}\d)/)||[])[0]?.trim();
 const linkedin=normalizedLinkedIn(sourceText);
 const parts=displayName?.split(/\s+/).filter(Boolean)||[];
 const skillsSection=section(sourceText,['Core Competencies','Skills','Technical Skills','Competencies','Expertise']);
 const certificationsSection=section(sourceText,['Certifications','Certificates','Licences','Licenses']);
 const educationSection=section(sourceText,['Education','Academic Background']);
 const skills=unique((skillsSection||'').split(/[,•|;\n]/).map(x=>x.trim()).filter(x=>x.length>=2&&x.length<=80)).slice(0,100);
 const certifications=unique((certificationsSection||'').split(/\n|;/).map(x=>x.trim()).filter(x=>x.length>=2&&x.length<=160)).slice(0,50);
 const education=unique((educationSection||'').split(/\n/).map(x=>x.trim()).filter(x=>x.length>=3&&x.length<=220)).slice(0,50);
 const yearVals=[...sourceText.matchAll(/\b((?:19|20)\d{2})\b/g)].map(m=>Number(m[1]));let yearsOfExperience: number|undefined; if(yearVals.length>=2){const min=Math.min(...yearVals),max=Math.min(new Date().getUTCFullYear(),Math.max(...yearVals));if(max>=min)yearsOfExperience=Math.min(50,max-min)}
 const warnings:string[]=[];
 if(!displayName)warnings.push('Candidate name could not be identified deterministically.');
 if(!email)warnings.push('Candidate email was not detected.');
 return{firstName:parts[0],lastName:parts.length>1?parts[parts.length-1]:undefined,displayName,email,phone,location:labeledLocation(sourceText),linkedinUrl:linkedin,skills,certifications,education,employers:[],jobTitles:[],yearsOfExperience,sourceText,warnings,parser:'deterministic'};
}
function section(text:string,names:string[]){for(const n of names){const re=new RegExp(`(?:^|\\n)\\s*${n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*[:\\n]([\\s\\S]*?)(?=\\n\\s*[A-Z][A-Z &/()-]{3,}[:\\n]|$)`,'i');const m=re.exec(text);if(m?.[1]?.trim())return m[1].trim().slice(0,10000)}return''}

export function buildAtsReview(input:{id:string;applicationId:string;candidateId:string;requisition:Requisition;candidate:Candidate;profile:ParsedResumeProfile;createdBy:string;createdAt:string;sourceMeta?:AtsResumeReview['sourceMeta']}):AtsResumeReview{
 const resume=input.profile.sourceText,req=input.requisition,allRequirements=(req.requirements||[]).map(x=>x.trim()).filter(Boolean),sensitiveRequirements=allRequirements.filter(containsSensitiveCriterion),requirements=allRequirements.filter(x=>!containsSensitiveCriterion(x)),safeDescription=safeJobDescription(req.description||''),keywords=topJobKeywords(req),resumeSet=new Set(terms(resume));
 const candidateYears=input.profile.yearsOfExperience??explicitYears(resume);
 const evidence:AtsEvidenceMatch[]=[];let reqScore=0;
 if(requirements.length){let total=0;for(const r of requirements){const m=requirementMatch(resume,r),criterionYears=explicitYears(r),durationScore=criterionYears==null?1:candidateYears==null?0.35:Math.min(1,candidateYears/Math.max(1,criterionYears)),matched=m.score>=0.62&&durationScore>=1,totalScore=criterionYears==null?m.score:Math.min(m.score,durationScore);total+=totalScore;evidence.push({criterion:r,category:'required_qualification',weight:1/requirements.length,matched,confidence:Math.min(1,0.55+totalScore*0.45),evidence:matched?snippet(resume,r):undefined,missingTerms:[...m.missing,...(!matched&&criterionYears!=null&&durationScore<1?[candidateYears==null?`evidence of ${criterionYears}+ years`: `${criterionYears}+ years (resume evidence: approximately ${candidateYears})`]:[])].flat().slice(0,8)});}reqScore=total/requirements.length;}
 const matchedKeywords=keywords.filter(k=>resumeSet.has(k)),missingKeywords=keywords.filter(k=>!resumeSet.has(k));const skillScore=keywords.length?matchedKeywords.length/keywords.length:0;
 const respText=section(safeDescription,['Responsibilities','What you will do','Duties'])||safeDescription,respKeywords=unique(terms(respText)).slice(0,35),respMatched=respKeywords.filter(k=>resumeSet.has(k)),responsibilityScore=respKeywords.length?respMatched.length/respKeywords.length:0;
 const requiredYears=explicitYears([safeDescription,...requirements].join(' '));let experienceScore=0;if(requiredYears!=null)experienceScore=candidateYears==null?0.35:Math.min(1,candidateYears/Math.max(1,requiredYears));
 if(requiredYears!=null)evidence.push({criterion:`${requiredYears}+ years of relevant experience`,category:'experience',weight:1,matched:(candidateYears||0)>=requiredYears,confidence:candidateYears==null?0.45:0.82,evidence:candidateYears!=null?`Resume evidence indicates approximately ${candidateYears} year(s) across dated experience.`:undefined,missingTerms:candidateYears==null?['experience duration evidence']:[]});
 const jobEdu=educationSignals([safeDescription,...requirements].join(' ')),resumeEdu=new Set(educationSignals(resume)),educationScore=jobEdu.length?jobEdu.filter(x=>resumeEdu.has(x)).length/jobEdu.length:0;
 const quality=[Boolean(input.profile.displayName),Boolean(input.profile.email),resume.length>500,input.profile.skills.length>0,input.profile.education.length>0||/education/i.test(resume)].filter(Boolean).length/5;
 const breakdown={requirements:percent(reqScore*100),skills:percent(skillScore*100),responsibilities:percent(responsibilityScore*100),experience:percent(experienceScore*100),educationCertification:percent(educationScore*100),documentQuality:percent(quality*100)};
 const dimensions=[
  {key:'requirements' as const,weight:45,active:requirements.length>0,value:reqScore},
  {key:'skills' as const,weight:20,active:keywords.length>0,value:skillScore},
  {key:'responsibilities' as const,weight:12,active:respKeywords.length>0,value:responsibilityScore},
  {key:'experience' as const,weight:13,active:requiredYears!=null,value:experienceScore},
  {key:'educationCertification' as const,weight:7,active:jobEdu.length>0,value:educationScore},
  {key:'documentQuality' as const,weight:3,active:true,value:quality},
 ];
 const activeDimensions=dimensions.filter(d=>d.active),activeWeight=activeDimensions.reduce((n,d)=>n+d.weight,0),weighted=activeDimensions.reduce((n,d)=>n+d.value*d.weight,0),score=percent(activeWeight?weighted/activeWeight*100:0),assessmentCoverage=percent(activeWeight),assessedDimensions=activeDimensions.map(d=>d.key),warnings:string[]=[];
 if(!requirements.length)warnings.push('No explicit non-sensitive must-have requirements were available. Add recruiter-reviewed requirements before relying on the ATS alignment score.');
 if(assessmentCoverage<60)warnings.push(`Job-evidence coverage is ${assessmentCoverage}%. The requisition needs more explicit job-related criteria for a reliable ATS comparison.`);
 if(sensitiveRequirements.length)warnings.push(`${sensitiveRequirements.length} sensitive/protected-trait criterion or criteria were excluded from automated ATS scoring and require human/legal review.`);
 const band=assessmentCoverage<50?'limited_evidence':score>=85?'strong_alignment':score>=70?'good_alignment':score>=50?'partial_alignment':'limited_evidence';
 const matchedRequirements=evidence.filter(x=>x.category==='required_qualification'&&x.matched).map(x=>x.criterion),missingRequirements=evidence.filter(x=>x.category==='required_qualification'&&!x.matched).map(x=>x.criterion);
 const strengths=[matchedRequirements.length?`${matchedRequirements.length}/${Math.max(1,requirements.length)} stated requirement(s) have supporting resume evidence.`:'No explicit requisition requirements were provided.',matchedKeywords.length?`Matched job-language signals: ${matchedKeywords.slice(0,8).join(', ')}.`:'Limited direct keyword overlap was detected.'].filter(Boolean);
 const gaps=[...missingRequirements.slice(0,8),...(missingKeywords.length?[`Job-related terms without direct resume evidence: ${missingKeywords.slice(0,10).join(', ')}.`]:[]),...(requiredYears!=null&&candidateYears==null?['The resume does not provide enough dated evidence to verify the requested experience duration.']:[]),...(sensitiveRequirements.length?[`${sensitiveRequirements.length} sensitive/protected-trait criterion or criteria were excluded from automated ATS scoring and require human/legal review.`]:[])];
 const {sourceText,...profileSafe}=input.profile;
 return{id:input.id,applicationId:input.applicationId,requisitionId:req.id,candidateId:input.candidateId,score,band,breakdown,assessedDimensions,assessmentCoverage,warnings,matchedRequirements,missingRequirements,matchedKeywords:matchedKeywords.slice(0,30),missingKeywords:missingKeywords.slice(0,30),strengths,gaps,evidence,resumeProfile:profileSafe,sourceMeta:input.sourceMeta,jobTextHash:hash([req.title,req.description||'',...(req.requirements||[])].join('\n')),resumeTextHash:hash(resume),scoringVersion:ATS_SCORING_VERSION,humanReviewRequired:true,decisionBoundary:'Job-relevance evidence only. OPSIQO ATS does not automatically reject, hire, rank by protected traits, or replace recruiter/hiring-manager judgment.',createdBy:input.createdBy,createdAt:input.createdAt};
}

export function reviewCoverLetter(text:string,review:AtsResumeReview,requisition:Requisition):CoverLetterReview{
 const t=norm(text),signals=unique([...review.matchedKeywords,...review.matchedRequirements.flatMap(terms)]).slice(0,30),matched=signals.filter(s=>t.includes(norm(s))),missing=signals.filter(s=>!t.includes(norm(s)));const unsupported:string[]=[];
 const claims=[...text.matchAll(/\b(I (?:have|bring|possess|led|managed|achieved|delivered|increased|reduced|saved)\b[^.!?]{0,180})/gi)].map(m=>m[1]!.trim());for(const c of claims){const key=terms(c).filter(x=>x.length>3);const supported=key.filter(k=>review.matchedKeywords.includes(k)||review.evidence.some(e=>e.evidence&&norm(e.evidence).includes(k))).length;if(key.length>=3&&supported/Math.max(1,key.length)<0.25)unsupported.push(c.slice(0,220));}
 const relevanceScore=percent(signals.length?matched.length/signals.length*100:70),grounding=percent(Math.max(0,100-unsupported.length*20));const recommendations:string[]=[];if(missing.length)recommendations.push(`Consider addressing these job-related signals where truthful: ${missing.slice(0,8).join(', ')}.`);if(unsupported.length)recommendations.push('Verify or remove claims that are not supported by the submitted resume evidence.');if(text.length<700)recommendations.push('The letter may benefit from one additional evidence-based example tied to the role.');if(text.length>4500)recommendations.push('Consider tightening the letter for recruiter readability.');return{relevanceScore,evidenceGroundingScore:grounding,matchedJobSignals:matched,unsupportedClaims:unsupported,missingJobSignals:missing.slice(0,20),recommendations,humanReviewRequired:true};
}

export function deterministicCoverLetter(candidate:Candidate,requisition:Requisition,review:AtsResumeReview,tone:'professional'|'concise'|'warm'='professional'){
 const name=candidate.displayName||`${candidate.firstName} ${candidate.lastName}`.trim(),signals=review.matchedRequirements.slice(0,3),keywords=review.matchedKeywords.slice(0,6),evidence=[...signals,...keywords].filter(Boolean);const opener=tone==='warm'?`I am pleased to apply for the ${requisition.title} opportunity.`:`I am writing to apply for the ${requisition.title} position.`;const fit=signals.length?`My resume provides direct evidence relevant to ${signals.join('; ')}.`:keywords.length?`My background includes experience related to ${keywords.join(', ')}.`:'My background aligns with several responsibilities described for this role.';const close=tone==='concise'?'Thank you for considering my application. I would welcome the opportunity to discuss my qualifications.':'I would welcome the opportunity to discuss how my documented experience could contribute to your team. Thank you for your consideration.';return{ text:`Dear Hiring Team,\n\n${opener} ${fit}\n\n${review.strengths[0]||''}${review.strengths[1]?` ${review.strengths[1]}`:''}\n\n${close}\n\nSincerely,\n${name}`.replace(/\n\n\s+\n\n/g,'\n\n'), evidenceUsed:evidence };
}

export function analyzeJobDescription(text:string){
 const raw=text.replace(/\u0000/g,'').trim().slice(0,120000),sensitiveSegments=raw.split(/\r?\n|(?<=[.!?])\s+/).filter(containsSensitiveCriterion),source=safeJobDescription(raw);const requirementsSection=section(source,['Requirements','Required Qualifications','Qualifications','What you bring']),preferredSection=section(source,['Preferred Qualifications','Nice to Have','Preferred']),responsibilitiesSection=section(source,['Responsibilities','What You Will Do','Duties','Key Responsibilities']),skillsSection=section(source,['Skills','Core Competencies','Technical Skills']);
 const lines=(requirementsSection||source).split(/\r?\n/).map(x=>x.replace(/^\s*[-•*\d.)]+\s*/,'').trim()).filter(x=>x.length>=8&&x.length<=500);const requirementLines=unique(lines.filter(x=>/\b(required|minimum|must|experience|degree|certificate|certification|proficien|knowledge|skill|ability|license|licence|years?)\b/i.test(x))).slice(0,40);const preferred=unique((preferredSection||'').split(/\r?\n/).map(x=>x.replace(/^\s*[-•*\d.)]+\s*/,'').trim()).filter(x=>x.length>=8&&x.length<=500)).slice(0,30);const responsibilities=unique((responsibilitiesSection||'').split(/\r?\n/).map(x=>x.replace(/^\s*[-•*\d.)]+\s*/,'').trim()).filter(x=>x.length>=8&&x.length<=500)).slice(0,50);const keywords=topKeywordsText([source,skillsSection].join(' '),50);const education=educationSignals(source);const years=explicitYears(source);const warnings:string[]=[];if(!requirementLines.length)warnings.push('No explicit requirements section was detected. Review and add must-have criteria manually so ATS scoring does not rely only on broad job-description language.');if(sensitiveSegments.length)warnings.push(`${sensitiveSegments.length} sensitive/protected-trait criterion or segment was excluded from ATS requirement extraction. Review the job description for lawful, job-related criteria.`);return{requirements:requirementLines,preferredQualifications:preferred,responsibilities,skills:keywords,educationSignals:education,requiredYears:years,warnings};
}
function topKeywordsText(text:string,limit:number){const freq=new Map<string,number>();for(const t of terms(text))freq.set(t,(freq.get(t)||0)+1);return[...freq.entries()].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length).map(x=>x[0]).slice(0,limit)}
