import { createHash } from 'node:crypto';
import type { Candidate, Requisition } from '@/domain/recruiting';
import type { AtsEvidenceMatch, AtsResumeReview, CoverLetterReview, ParsedResumeProfile } from '@/domain/ats';

export const ATS_SCORING_VERSION = 'OPSIQO_ATS_JOB_RELEVANCE_V3';
const PROTECTED = new Set(['age','aged','young','younger','older','gender','male','female','woman','women','man','men','race','racial','religion','religious','faith','disability','disabled','marital','married','pregnant','pregnancy','ethnicity','ethnic','nationality','citizen','citizenship','sexual','orientation','veteran']);
const SENSITIVE_CRITERION = /\b(?:age|aged|young(?:er)?|older|gender|male|female|women?|men?|race|racial|religion|religious|faith|disability|disabled|marital|married|pregnan(?:t|cy)|ethnicity|ethnic|nationality|citizen(?:ship)?|sexual\s+orientation|veteran)\b/i;
const containsSensitiveCriterion=(s:string)=>SENSITIVE_CRITERION.test(s);
const safeJobDescription=(s:string)=>s.split(/\r?\n|(?<=[.!?])\s+/).filter(part=>!containsSensitiveCriterion(part)).join('\n');
const STOP = new Set(['a','an','of','to','in','on','as','at','by','or','is','be','the','and','for','with','that','this','from','you','your','our','are','will','have','has','had','into','their','they','them','who','but','not','all','any','can','may','must','should','required','preferred','work','working','role','job','position','candidate','experience','years','year','skills','skill','responsibilities','responsibility','requirements','requirement','qualifications','qualification','duties','duty','description','ability','including','such','other','using','use','within','about','more','minimum','strong','excellent','knowledge','responsible','demonstrated','proven']);
const ALIAS_GROUPS: Record<string,string[]> = {
  'human resources':['human resources','hr'],
  'human resources information system':['human resources information system','hris'],
  'applicant tracking system':['applicant tracking system','ats'],
  'learning management system':['learning management system','lms'],
  'occupational health and safety':['occupational health and safety','ohs','health and safety'],
  'search engine optimization':['search engine optimization','seo'],
  'search engine marketing':['search engine marketing','sem','paid search'],
  'pay per click':['pay per click','ppc'],
  'google analytics':['google analytics','ga4'],
  'google ads':['google ads','adwords'],
  'meta ads':['meta ads','facebook ads','instagram ads'],
  'customer relationship management':['customer relationship management','crm'],
  'return on investment':['return on investment','roi'],
  'key performance indicators':['key performance indicators','kpi','kpis'],
  'business to business':['business to business','b2b'],
  'business to consumer':['business to consumer','b2c'],
  'software as a service':['software as a service','saas'],
  'project management':['project management','project delivery'],
  'change management':['change management','organizational change'],
  'performance management':['performance management','performance review','performance reviews'],
  'employee relations':['employee relations','labour relations','labor relations'],
  'talent acquisition':['talent acquisition','recruitment','recruiting'],
  'data analysis':['data analysis','analytics','data analytics'],
  'microsoft excel':['microsoft excel','excel'],
  'power bi':['power bi','powerbi'],
};
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const norm=(s:string)=>s.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9+#./-]+/g,' ').replace(/\s+/g,' ').trim();
function stem(token:string){
  let t=token.toLowerCase();
  if(t.length>5&&t.endsWith('ies'))t=`${t.slice(0,-3)}y`;
  else if(t.length>5&&t.endsWith('ing'))t=t.slice(0,-3);
  else if(t.length>4&&t.endsWith('ed'))t=t.slice(0,-2);
  else if(t.length>4&&t.endsWith('es'))t=t.slice(0,-2);
  else if(t.length>3&&t.endsWith('s'))t=t.slice(0,-1);
  return t;
}
const terms=(s:string)=>norm(s).split(' ').map(x=>x.replace(/[.]+$/g,'')).filter(x=>x.length>=2&&!/^\d+(?:[.+-]\d+)?\+?$/.test(x)&&!STOP.has(x)&&!PROTECTED.has(x));
const stemTerms=(s:string)=>terms(s).map(stem);
const unique=<T,>(a:T[])=>[...new Set(a)];
const cleanList=(items:string[],limit:number,maxLen:number)=>unique(items.map(x=>x.replace(/^[•*\-–—]+\s*/,'').replace(/\s+/g,' ').trim()).filter(x=>x.length>=2&&x.length<=maxLen)).slice(0,limit);

function aliasSignals(text:string){
 const n=` ${norm(text)} `;const out:string[]=[];
 for(const [canonical,aliases] of Object.entries(ALIAS_GROUPS))if(aliases.some(a=>n.includes(` ${norm(a)} `)))out.push(canonical);
 return out;
}
function semanticTermSet(text:string){return new Set([...stemTerms(text),...aliasSignals(text).map(stem)]);}
function meaningfulPhrases(text:string){
 const toks=terms(text).filter(t=>!/^\d+$/.test(t));const phrases:string[]=[];
 for(let n=3;n>=2;n--)for(let i=0;i+n<=toks.length;i++){const p=toks.slice(i,i+n).join(' ');if(p.length>=8)phrases.push(p)}
 return unique(phrases).slice(0,24);
}
function directPhraseMatch(haystack:string,criterion:string){const h=` ${norm(haystack)} `;return meaningfulPhrases(criterion).find(p=>h.includes(` ${norm(p)} `));}
function aliasMatch(resume:string,criterion:string){const r=new Set(aliasSignals(resume)),c=aliasSignals(criterion);return c.find(x=>r.has(x));}
function snippet(text:string, needle:string){
 const candidates=[directPhraseMatch(text,needle),...terms(needle).slice(0,8)].filter(Boolean) as string[];const lower=norm(text);let idx=-1;
 for(const w of candidates){idx=lower.indexOf(norm(w));if(idx>=0)break}if(idx<0)return undefined;
 const rawIdx=Math.min(text.length-1,Math.max(0,Math.floor(idx/Math.max(1,lower.length)*text.length)));
 return text.slice(Math.max(0,rawIdx-160),Math.min(text.length,rawIdx+420)).replace(/\s+/g,' ').trim();
}
function requirementMatch(resume:string,criterion:string):{score:number;missing:string[];matchedTerms:string[];method:'direct_phrase'|'alias'|'token_overlap'|'none'}{
 const hasYearRequirement=explicitYears(criterion)!=null;
 const criterionTokens=unique(stemTerms(criterion).filter(x=>!(hasYearRequirement&&/^\d+$/.test(x))));
 if(!criterionTokens.length)return{score:0,missing:[] as string[],matchedTerms:[] as string[],method:'none' as const};
 const resumeSet=semanticTermSet(resume),criterionAliases=unique(aliasSignals(criterion)),resumeAliases=new Set(aliasSignals(resume));
 const matchedTokens=criterionTokens.filter(x=>resumeSet.has(x));
 const missingTokens=criterionTokens.filter(x=>!resumeSet.has(x));
 const matchedAliases=criterionAliases.filter(x=>resumeAliases.has(x));
 const missingAliases=criterionAliases.filter(x=>!resumeAliases.has(x));
 const aliasCoverage=criterionAliases.length?matchedAliases.length/criterionAliases.length:0;
 const alternativesAllowed=/\b(?:or|either)\b/i.test(criterion);
 let score=matchedTokens.length/criterionTokens.length;
 const phrase=directPhraseMatch(resume,criterion);
 const phraseCoverage=phrase?Math.min(1,stemTerms(phrase).length/Math.max(1,criterionTokens.length)):0;
 if(phrase&&phraseCoverage>=0.75)score=Math.max(score,Math.min(0.95,0.6+phraseCoverage*0.35));
 if(matchedAliases.length)score=Math.max(score,alternativesAllowed?0.82:aliasCoverage);
 // A conjunctive requirement naming multiple recognized concepts must not be
 // treated as fully supported when the resume proves only a subset.
 if(criterionAliases.length>1&&!alternativesAllowed&&missingAliases.length)score=Math.min(score,0.55);
 const fullAliasSupport=criterionAliases.length>0&&(alternativesAllowed?matchedAliases.length>0:missingAliases.length===0);
 const strongPhrase=Boolean(phrase&&phraseCoverage>=0.75);
 const method:'direct_phrase'|'alias'|'token_overlap'|'none'=strongPhrase?'direct_phrase':matchedAliases.length?'alias':matchedTokens.length?'token_overlap':'none';
 const missing=strongPhrase||fullAliasSupport?[]:unique([...missingAliases,...missingTokens]);
 return{score:Math.min(1,score),missing,matchedTerms:unique([...(strongPhrase&&phrase?[phrase]:[]),...matchedAliases,...matchedTokens]).slice(0,12),method};
}
function topJobKeywords(req:Requisition){
 const safeRequirements=(req.requirements||[]).filter(x=>!containsSensitiveCriterion(x));const text=[req.title,safeJobDescription(req.description||''),...safeRequirements].join(' '),freq=new Map<string,number>();
 for(const t of terms(text)){const key=stem(t);freq.set(key,(freq.get(key)||0)+1)}
 const canonical=aliasSignals(text);const tokens=[...freq.entries()].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length).map(x=>x[0]).filter(x=>!PROTECTED.has(x));
 return unique([...canonical,...tokens]).slice(0,40);
}
function explicitYears(s:string){const vals=[...s.matchAll(/(?:minimum\s+|at least\s+)?(\d{1,2})\+?\s*(?:years?|yrs?)\b/gi)].map(m=>Number(m[1])).filter(Number.isFinite);return vals.length?Math.max(...vals):undefined;}
function educationSignals(s:string){return unique((s.match(/\b(?:bachelor(?:'s)?|master(?:'s)?|phd|doctorate|diploma|degree|certificate|certification|cpa|chre|chrl|chrp|pmp|shrm(?:-cp|-scp)?|cphr|cfa|mba)\b/gi)||[]).map(norm));}
function percent(n:number){return Math.max(0,Math.min(100,Math.round(n)));}

function candidateNameFromFileName(fileName?:string){
 if(!fileName)return undefined;
 let base=fileName.split(/[\\/]/).pop()||'';
 base=base.replace(/\.[A-Za-z0-9]{1,8}$/,'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').replace(/\b(?:resume|curriculum\s+vitae|cv|profile|candidate|application|updated|final|professional|human\s+resources|hr|chre|chrl|chrp|cphr|pmp|cpa|cfa|sphr|phr|mba|phd|shrm\s*(?:cp|scp)?)\b/gi,' ').replace(/\b\d{4,}\b/g,' ').replace(/\s+/g,' ').trim();
 return plausiblePersonName(base)?base:undefined;
}
const NON_NAME_LINE=/\b(?:resume|curriculum\s+vitae|professional\s+summary|summary|profile|skills?|experience|employment|education|certifications?|competencies|expertise|linkedin|portfolio|github|marketing|specialist|manager|director|engineer|analyst|developer|consultant|coordinator|assistant|executive|administrator|officer|designer|accountant|sales|digital|growth)\b/i;
const PROFESSIONAL_CREDENTIAL_TOKEN=/\b(?:CHRE|CHRL|CHRP|CPHR|PMP|CPA|CFA|SPHR|PHR|SHRM[- ]?(?:CP|SCP)|MBA|PHD)\b/i;
function stripCredentialSuffix(value:string){return value.replace(/\s*,?\s*(?:(?:CHRE|CHRL|CHRP|CPHR|PMP|CPA|CFA|SPHR|PHR|SHRM[- ]?(?:CP|SCP)|MBA|PHD)(?:\s*,?\s*)?)+$/i,'').trim();}
function recognizedProfessionalCredentials(text:string){const out:string[]=[];for(const m of text.matchAll(/\b(CHRE|CHRL|CHRP|CPHR|PMP|CPA|CFA|SPHR|PHR|SHRM[- ]?(?:CP|SCP))\b/gi)){let value=m[1]!.toUpperCase().replace(/\s+/g,'-');if(value.startsWith('SHRM')&&!value.startsWith('SHRM-'))value=value.replace(/^SHRM/,'SHRM-');out.push(value)}return unique(out);}
function looksLikeLocationLine(value:string){return value.length>=5&&value.length<=100&&/^[\p{L} .'-]+,\s*[\p{L} .'-]{2,}(?:,\s*[A-Z]{2,3})?$/u.test(value)&&!PROFESSIONAL_CREDENTIAL_TOKEN.test(value)&&!NON_NAME_LINE.test(value);}
function plausiblePersonName(value:string){
 const clean=value.replace(/[•|]+/g,' ').replace(/\s+/g,' ').trim();
 if(clean.length<3||clean.length>100||/@|https?:\/\/|www\.|\d/.test(clean)||NON_NAME_LINE.test(clean))return false;
 const tokens=clean.split(/\s+/).filter(Boolean);if(tokens.length<2||tokens.length>5)return false;
 return tokens.every(token=>/^[\p{L}][\p{L}'’.-]*$/u.test(token));
}
function candidateNameFromLines(lines:string[]){
 const labeled=lines.slice(0,30).map(line=>stripCredentialSuffix(/^(?:candidate\s+)?(?:full\s+)?name\s*[:\-]\s*(.+)$/i.exec(line)?.[1]?.trim()||'')).find((value):value is string=>Boolean(value&&plausiblePersonName(value)));if(labeled)return labeled;
 let best:{value:string;score:number}|undefined;
 for(let i=0;i<Math.min(lines.length,24);i++){const value=stripCredentialSuffix(lines[i]!.replace(/^[•*\-]+\s*/,'').trim());if(!plausiblePersonName(value))continue;const tokens=value.split(/\s+/);let score=40-Math.min(30,i*3);if(i===0)score+=25;if(tokens.every(token=>/^\p{Lu}/u.test(token)))score+=10;if(tokens.length===2||tokens.length===3)score+=8;if(!best||score>best.score)best={value,score};}
 return best?.value;
}
function normalizedLinkedIn(sourceText:string){const raw=(sourceText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[^\s)>,]+/i)||[])[0];if(!raw)return undefined;return /^https?:\/\//i.test(raw)?raw:`https://${raw}`;}
function phoneFromText(sourceText:string){const candidates=sourceText.match(/(?:\+?\d{1,3}[ .()-]*)?(?:\(?\d{2,4}\)?[ .()-]*){2,4}\d{3,4}/g)||[];for(const raw of candidates){const digits=raw.replace(/\D/g,'');if(digits.length<10||digits.length>15)continue;if(/^(?:19|20)\d{2}(?:19|20)\d{2}$/.test(digits))continue;return raw.replace(/\s+/g,' ').trim()}return undefined;}
function labeledLocation(sourceText:string,displayName?:string){
 const isRejected=(value:string)=>{const n=norm(value),person=displayName?norm(displayName):'';return Boolean(person&&(n===person||n.startsWith(`${person} `)||n.includes(person)))||PROFESSIONAL_CREDENTIAL_TOKEN.test(value)||NON_NAME_LINE.test(value)};
 const raw=/^(?:location|based\s+in|address)\s*[:\-]\s*(.+)$/im.exec(sourceText)?.[1]?.trim();if(raw&&raw.length<=180&&!/@|https?:\/\//i.test(raw)&&!isRejected(raw))return raw;
 const header=sourceText.split(/\r?\n/).slice(0,18).map(x=>x.trim()).find(x=>looksLikeLocationLine(x)&&!/@|linkedin|summary|experience/i.test(x)&&!isRejected(x));
 return header;
}
function headlineFromLines(lines:string[],name?:string){
 const start=name?Math.max(0,lines.findIndex(x=>stripCredentialSuffix(x)===name)+1):0;
 return lines.slice(start,start+12).find(x=>x.length>=3&&x.length<=180&&!/@|linkedin|https?:|\+?\d[\d .()-]{7,}\d/.test(x)&&!plausiblePersonName(stripCredentialSuffix(x))&&!looksLikeLocationLine(x)&&!PROFESSIONAL_CREDENTIAL_TOKEN.test(x)&&!/^(?:summary|profile|experience|education|skills|certifications?)$/i.test(x));
}
function section(text:string,names:string[]){
 const lines=text.split(/\r?\n/);const headings=new Set(names.map(norm));let start=-1;
 for(let i=0;i<lines.length;i++){const cleaned=norm(lines[i]!.replace(/[:：]\s*$/,''));if(headings.has(cleaned)){start=i+1;break}}
 if(start<0)return'';
 const knownHeading=/^(?:professional\s+summary|summary|profile|experience|professional\s+experience|work\s+experience|employment\s+history|career\s+experience|career\s+history|work\s+history|employment\s+experience|education|academic\s+background|skills|technical\s+skills|core\s+competencies|competencies|expertise|certifications?|certificates|licenses?|licences?|projects?|volunteer|languages?|awards?|requirements?|required\s+qualifications?|qualifications?|what\s+you\s+bring|preferred\s+qualifications?|nice\s+to\s+have|preferred|responsibilities|what\s+you\s+will\s+do|duties|key\s+responsibilities)\s*:??\s*$/i;
 const out:string[]=[];for(let i=start;i<lines.length;i++){if(knownHeading.test(lines[i]!.trim()))break;out.push(lines[i]!)}return out.join('\n').trim().slice(0,20000);
}
const EXPERIENCE_HEADINGS=['Experience','Professional Experience','Work Experience','Employment History','Career Experience','Career History','Work History','Employment Experience'];
function parseExperienceMonths(text:string){
 // Fail closed when a reliable experience section cannot be isolated. This
 // prevents education/project date ranges from inflating employment tenure.
 const experience=section(text,EXPERIENCE_HEADINGS);
 if(!experience)return undefined;
 const month='(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
 const wordRe=new RegExp(`(?:(${month})\\s+)?((?:19|20)\\d{2})\\s*(?:[-–—]|to)\\s*(?:(?:(${month})\\s+)?((?:19|20)\\d{2})|Present|Current|Now)`, 'gi');
 const numericRe=/\b(0?[1-9]|1[0-2])[\/.]((?:19|20)\d{2})\s*(?:[-–—]|to)\s*(?:(0?[1-9]|1[0-2])[\/.]((?:19|20)\d{2})|present|current|now)\b/gi;
 const isoRe=/\b((?:19|20)\d{2})[-/](0?[1-9]|1[0-2])\s*(?:[-–—]|to)\s*(?:((?:19|20)\d{2})[-/](0?[1-9]|1[0-2])|present|current|now)\b/gi;
 const monthIndex:Record<string,number>={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
 const monthNo=(value:string|undefined,fallback:number)=>value?(monthIndex[value.slice(0,3).toLowerCase()]??fallback):fallback;
 const intervals:[number,number][]=[];const nowDate=new Date();
 const add=(sy:number,sm:number,ey:number,em:number)=>{const a=sy*12+sm,b=ey*12+em;if(sy>=1900&&ey<=nowDate.getUTCFullYear()+1&&b>=a&&b-a<=60*12)intervals.push([a,b]);};
 for(const m of experience.matchAll(wordRe)){const sy=Number(m[2]);if(!sy)continue;const sm=monthNo(m[1],0);if(m[4])add(sy,sm,Number(m[4]),monthNo(m[3],11));else add(sy,sm,nowDate.getUTCFullYear(),nowDate.getUTCMonth());}
 for(const m of experience.matchAll(numericRe)){const sy=Number(m[2]),sm=Number(m[1])-1;if(m[4])add(sy,sm,Number(m[4]),Number(m[3])-1);else add(sy,sm,nowDate.getUTCFullYear(),nowDate.getUTCMonth());}
 for(const m of experience.matchAll(isoRe)){const sy=Number(m[1]),sm=Number(m[2])-1;if(m[3])add(sy,sm,Number(m[3]),Number(m[4])-1);else add(sy,sm,nowDate.getUTCFullYear(),nowDate.getUTCMonth());}
 if(!intervals.length)return undefined;intervals.sort((a,b)=>a[0]-b[0]);const merged:[number,number][]=[];for(const [a,b] of intervals){const last=merged.at(-1);if(last&&a<=last[1]+1)last[1]=Math.max(last[1],b);else merged.push([a,b]);}const months=merged.reduce((n,[a,b])=>n+(b-a+1),0);return Math.min(60,Math.round(months/12*10)/10);
}
function experienceEntities(text:string){
 const exp=section(text,EXPERIENCE_HEADINGS);if(!exp)return{employers:[] as string[],jobTitles:[] as string[]};const lines=exp.split(/\r?\n/).map(x=>x.replace(/^[•*\-]+\s*/,'').replace(/\s+/g,' ').trim()).filter(Boolean);
 const titleWords=/\b(?:manager|director|specialist|coordinator|analyst|engineer|developer|designer|consultant|advisor|partner|lead|head|officer|administrator|assistant|executive|accountant|recruiter|generalist|supervisor|president|founder|owner|pharmacist|nurse|teacher|associate|representative|technician|controller|bookkeeper|strategist|copywriter|marketer)\b/i;
 const dateLine=/(?:19|20)\d{2}|present|current/i;const jobTitles:string[]=[],employers:string[]=[];
 for(let i=0;i<lines.length;i++){const line=lines[i]!;if(line.length>180||/^\d/.test(line))continue;const parts=line.split(/\s+[|·@]\s+|\s+[–—-]\s+/).map(x=>x.trim()).filter(Boolean);if(parts.length>=2&&titleWords.test(parts[0]!)&&!dateLine.test(parts[0]!)){jobTitles.push(parts[0]!);if(!dateLine.test(parts[1]!))employers.push(parts[1]!);continue}if(titleWords.test(line)&&!dateLine.test(line)&&line.split(/\s+/).length<=12){jobTitles.push(line);const next=lines[i+1];if(next&&!dateLine.test(next)&&!titleWords.test(next)&&next.length<=120)employers.push(next)}}
 return{employers:cleanList(employers,60,160),jobTitles:cleanList(jobTitles,60,160)};
}

export function parseResumeTextDeterministic(text:string,fileName?:string):ParsedResumeProfile{
 const sourceText=text.replace(/\u0000/g,'').replace(/\r\n/g,'\n').trim().slice(0,500000),lines=sourceText.split(/\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
 const labeledName=candidateNameFromLines(lines),fileNameName=candidateNameFromFileName(fileName),displayName=labeledName||fileNameName;
 const email=(sourceText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]?.trim();
 const phone=phoneFromText(sourceText);const linkedin=normalizedLinkedIn(sourceText);const parts=displayName?.split(/\s+/).filter(Boolean)||[];
 const skillsSection=section(sourceText,['Core Competencies','Skills','Technical Skills','Competencies','Expertise']);const certificationsSection=section(sourceText,['Certifications','Certificates','Licences','Licenses']);const educationSection=section(sourceText,['Education','Academic Background']);const summarySection=section(sourceText,['Professional Summary','Summary','Profile']);
 const skillCandidates=(skillsSection||'').split(/[,•|;\n]/).map(x=>x.trim()).filter(x=>x.length>=2&&x.length<=100&&!/[.!?].{25,}/.test(x));const skills=cleanList([...skillCandidates,...aliasSignals(skillsSection||'')],120,100);const certifications=cleanList([...(certificationsSection||'').split(/\n|;/),...recognizedProfessionalCredentials(lines.slice(0,30).join('\n')+'\n'+(certificationsSection||''))],60,180);const education=cleanList((educationSection||'').split(/\n/),60,240);const entities=experienceEntities(sourceText);const yearsOfExperience=parseExperienceMonths(sourceText);
 const headline=headlineFromLines(lines,displayName);const warnings:string[]=[];const extractionSignals:string[]=[];
 if(displayName)extractionSignals.push(labeledName?'name:document':'name:filename');else warnings.push('Candidate name could not be identified deterministically.');if(email)extractionSignals.push('email');else warnings.push('Candidate email was not detected.');if(phone)extractionSignals.push('phone');if(linkedin)extractionSignals.push('linkedin');if(skills.length)extractionSignals.push('skills');if(certifications.length)extractionSignals.push('certifications');if(education.length)extractionSignals.push('education');if(entities.jobTitles.length)extractionSignals.push('job_titles');if(entities.employers.length)extractionSignals.push('employers');if(yearsOfExperience!=null)extractionSignals.push('experience_duration');
 const parseQuality=percent(([displayName,email,phone||linkedin,skills.length,education.length,entities.jobTitles.length||entities.employers.length,sourceText.length>500].filter(Boolean).length/7)*100);
 return{firstName:parts[0],lastName:parts.length>1?parts[parts.length-1]:undefined,displayName,email,phone,location:labeledLocation(sourceText,displayName),linkedinUrl:linkedin,headline,summary:summarySection||undefined,skills,certifications,education,employers:entities.employers,jobTitles:entities.jobTitles,yearsOfExperience,sourceText,warnings,parser:'deterministic',parseQuality,extractionSignals};
}

export function buildAtsReview(input:{id:string;applicationId:string;candidateId:string;requisition:Requisition;candidate:Candidate;profile:ParsedResumeProfile;createdBy:string;createdAt:string;sourceMeta?:AtsResumeReview['sourceMeta']}):AtsResumeReview{
 const resume=input.profile.sourceText,req=input.requisition,allRequirements=(req.requirements||[]).map(x=>x.trim()).filter(Boolean),sensitiveRequirements=allRequirements.filter(containsSensitiveCriterion),requirements=allRequirements.filter(x=>!containsSensitiveCriterion(x)),safeDescription=safeJobDescription(req.description||''),keywords=topJobKeywords(req),resumeSemantic=semanticTermSet(resume),resumeAliases=new Set(aliasSignals(resume));
 const candidateYears=input.profile.yearsOfExperience??explicitYears(resume);const evidence:AtsEvidenceMatch[]=[];let reqScore=0;
 if(requirements.length){let total=0;for(const r of requirements){const m=requirementMatch(resume,r),criterionYears=explicitYears(r),durationScore=criterionYears==null?1:candidateYears==null?0.35:Math.min(1,candidateYears/Math.max(1,criterionYears)),matched=m.score>=0.58&&durationScore>=0.95,totalScore=criterionYears==null?m.score:Math.min(m.score,durationScore);total+=totalScore;evidence.push({criterion:r,category:'required_qualification',weight:1/requirements.length,matched,confidence:Math.min(0.98,0.5+totalScore*0.45),evidence:totalScore>=0.35?snippet(resume,r):undefined,missingTerms:[...m.missing,...(!matched&&criterionYears!=null&&durationScore<0.95?[candidateYears==null?`evidence of ${criterionYears}+ years`:`${criterionYears}+ years (resume evidence: approximately ${candidateYears})`]:[])].slice(0,10),matchedTerms:m.matchedTerms,matchScore:percent(totalScore*100),matchMethod:m.method});}reqScore=total/requirements.length;}
 const matchedKeywords=keywords.filter(k=>resumeSemantic.has(stem(k))||resumeAliases.has(k)),missingKeywords=keywords.filter(k=>!matchedKeywords.includes(k));const skillScore=keywords.length?matchedKeywords.length/keywords.length:0;
 const respText=section(safeDescription,['Responsibilities','What You Will Do','What you will do','Duties','Key Responsibilities'])||safeDescription,respSignals=unique([...aliasSignals(respText),...stemTerms(respText)]).slice(0,35),respMatched=respSignals.filter(k=>resumeSemantic.has(stem(k))||resumeAliases.has(k)),responsibilityScore=respSignals.length?respMatched.length/respSignals.length:0;
 const requiredYears=explicitYears([safeDescription,...requirements].join(' '));let experienceScore=0;if(requiredYears!=null)experienceScore=candidateYears==null?0.35:Math.min(1,candidateYears/Math.max(1,requiredYears));if(requiredYears!=null)evidence.push({criterion:`${requiredYears}+ years of relevant experience`,category:'experience',weight:1,matched:(candidateYears||0)>=requiredYears,confidence:candidateYears==null?0.42:0.88,evidence:candidateYears!=null?`Dated employment ranges support approximately ${candidateYears} year(s) of experience after overlap normalization.`:undefined,missingTerms:candidateYears==null?['experience duration evidence']:[],matchedTerms:candidateYears!=null?[`${candidateYears} years estimated from dated employment ranges`]:[],matchScore:percent(experienceScore*100),matchMethod:'duration'});
 const jobEdu=educationSignals([safeDescription,...requirements].join(' ')),resumeEdu=new Set(educationSignals(resume)),educationScore=jobEdu.length?jobEdu.filter(x=>resumeEdu.has(x)).length/jobEdu.length:0;
 const quality=[Boolean(input.profile.displayName),Boolean(input.profile.email),resume.length>500,input.profile.skills.length>0,input.profile.education.length>0||/education/i.test(resume),Boolean(input.profile.jobTitles.length||input.profile.employers.length)].filter(Boolean).length/6;
 const breakdown={requirements:percent(reqScore*100),skills:percent(skillScore*100),responsibilities:percent(responsibilityScore*100),experience:percent(experienceScore*100),educationCertification:percent(educationScore*100),documentQuality:percent(quality*100)};
 const dimensions=[{key:'requirements' as const,weight:48,active:requirements.length>0,value:reqScore},{key:'skills' as const,weight:18,active:keywords.length>0,value:skillScore},{key:'responsibilities' as const,weight:12,active:respSignals.length>0,value:responsibilityScore},{key:'experience' as const,weight:12,active:requiredYears!=null,value:experienceScore},{key:'educationCertification' as const,weight:7,active:jobEdu.length>0,value:educationScore},{key:'documentQuality' as const,weight:3,active:true,value:quality}];
 const activeDimensions=dimensions.filter(d=>d.active),activeWeight=activeDimensions.reduce((n,d)=>n+d.weight,0),weighted=activeDimensions.reduce((n,d)=>n+d.value*d.weight,0),score=percent(activeWeight?weighted/activeWeight*100:0),assessmentCoverage=percent(activeWeight),assessedDimensions=activeDimensions.map(d=>d.key),warnings=[...(input.profile.warnings||[])];
 if(!requirements.length)warnings.push('No explicit non-sensitive must-have requirements were available. Add recruiter-reviewed requirements before relying on the ATS alignment score.');if(assessmentCoverage<60)warnings.push(`Job-evidence coverage is ${assessmentCoverage}%. The requisition needs more explicit job-related criteria for a reliable ATS comparison.`);if(sensitiveRequirements.length)warnings.push(`${sensitiveRequirements.length} sensitive/protected-trait criterion or criteria were excluded from automated ATS scoring and require human/legal review.`);if((input.profile.parseQuality??100)<55)warnings.push(`Resume extraction quality is ${input.profile.parseQuality}%. Review parsed identity, experience, education and skills before relying on the evidence matrix.`);
 const band=assessmentCoverage<50?'limited_evidence':score>=85?'strong_alignment':score>=70?'good_alignment':score>=50?'partial_alignment':'limited_evidence';const matchedRequirements=evidence.filter(x=>x.category==='required_qualification'&&x.matched).map(x=>x.criterion),missingRequirements=evidence.filter(x=>x.category==='required_qualification'&&!x.matched).map(x=>x.criterion);
 const strengths=[matchedRequirements.length?`${matchedRequirements.length}/${Math.max(1,requirements.length)} stated requirement(s) have supporting resume evidence.`:'No explicit requisition requirements were provided.',matchedKeywords.length?`Matched semantic job signals: ${matchedKeywords.slice(0,8).join(', ')}.`:'Limited direct or equivalent job-signal overlap was detected.'].filter(Boolean);const gaps=[...missingRequirements.slice(0,8),...(missingKeywords.length?[`Job-related signals without direct or equivalent resume evidence: ${missingKeywords.slice(0,10).join(', ')}.`]:[]),...(requiredYears!=null&&candidateYears==null?['The resume does not provide enough dated employment evidence to verify the requested experience duration.']:[]),...(sensitiveRequirements.length?[`${sensitiveRequirements.length} sensitive/protected-trait criterion or criteria were excluded from automated ATS scoring and require human/legal review.`]:[])];const {sourceText,...profileSafe}=input.profile;
 return{id:input.id,applicationId:input.applicationId,requisitionId:req.id,candidateId:input.candidateId,score,band,breakdown,assessedDimensions,assessmentCoverage,warnings:unique(warnings),matchedRequirements,missingRequirements,matchedKeywords:matchedKeywords.slice(0,30),missingKeywords:missingKeywords.slice(0,30),strengths,gaps,evidence,resumeProfile:profileSafe,sourceMeta:input.sourceMeta,jobTextHash:hash([req.title,req.description||'',...(req.requirements||[])].join('\n')),resumeTextHash:hash(resume),scoringVersion:ATS_SCORING_VERSION,humanReviewRequired:true,decisionBoundary:'Job-relevance evidence only. OPSIQO ATS does not automatically reject, hire, advance, rank by protected traits, or replace recruiter/hiring-manager judgment. Scores are internal evidence-alignment indicators, not predictions of external ATS products.',createdBy:input.createdBy,createdAt:input.createdAt};
}

export function reviewCoverLetter(text:string,review:AtsResumeReview,requisition:Requisition):CoverLetterReview{
 const t=norm(text),signals=unique([...review.matchedKeywords,...review.matchedRequirements.flatMap(terms)]).slice(0,30),matched=signals.filter(s=>t.includes(norm(s))),missing=signals.filter(s=>!t.includes(norm(s)));const unsupported:string[]=[];const claims=[...text.matchAll(/\b(I (?:have|bring|possess|led|managed|achieved|delivered|increased|reduced|saved)\b[^.!?]{0,180})/gi)].map(m=>m[1]!.trim());for(const c of claims){const key=terms(c).filter(x=>x.length>3);const supported=key.filter(k=>review.matchedKeywords.some(x=>stem(x)===stem(k))||review.evidence.some(e=>e.evidence&&norm(e.evidence).includes(norm(k)))).length;if(key.length>=3&&supported/Math.max(1,key.length)<0.25)unsupported.push(c.slice(0,220));}const relevanceScore=percent(signals.length?matched.length/signals.length*100:70),grounding=percent(Math.max(0,100-unsupported.length*20));const recommendations:string[]=[];if(missing.length)recommendations.push(`Consider addressing these job-related signals where truthful: ${missing.slice(0,8).join(', ')}.`);if(unsupported.length)recommendations.push('Verify or remove claims that are not supported by the submitted resume evidence.');if(text.length<700)recommendations.push('The letter may benefit from one additional evidence-based example tied to the role.');if(text.length>4500)recommendations.push('Consider tightening the letter for recruiter readability.');return{relevanceScore,evidenceGroundingScore:grounding,matchedJobSignals:matched,unsupportedClaims:unsupported,missingJobSignals:missing.slice(0,20),recommendations,humanReviewRequired:true};
}

export function deterministicCoverLetter(candidate:Candidate,requisition:Requisition,review:AtsResumeReview,tone:'professional'|'concise'|'warm'='professional'){
 const name=candidate.displayName||`${candidate.firstName} ${candidate.lastName}`.trim(),signals=review.matchedRequirements.slice(0,3),keywords=review.matchedKeywords.slice(0,6),evidence=[...signals,...keywords].filter(Boolean);const opener=tone==='warm'?`I am pleased to apply for the ${requisition.title} opportunity.`:`I am writing to apply for the ${requisition.title} position.`;const fit=signals.length?`My resume provides direct evidence relevant to ${signals.join('; ')}.`:keywords.length?`My background includes experience related to ${keywords.join(', ')}.`:'My background aligns with several responsibilities described for this role.';const close=tone==='concise'?'Thank you for considering my application. I would welcome the opportunity to discuss my qualifications.':'I would welcome the opportunity to discuss how my documented experience could contribute to your team. Thank you for your consideration.';return{ text:`Dear Hiring Team,\n\n${opener} ${fit}\n\n${review.strengths[0]||''}${review.strengths[1]?` ${review.strengths[1]}`:''}\n\n${close}\n\nSincerely,\n${name}`.replace(/\n\n\s+\n\n/g,'\n\n'), evidenceUsed:evidence };
}

export function analyzeJobDescription(text:string){
 const raw=text.replace(/\u0000/g,'').trim().slice(0,120000),sensitiveSegments=raw.split(/\r?\n|(?<=[.!?])\s+/).filter(containsSensitiveCriterion),source=safeJobDescription(raw);const requirementsSection=section(source,['Requirements','Required Qualifications','Qualifications','What You Bring','What you bring']),preferredSection=section(source,['Preferred Qualifications','Nice to Have','Nice to have','Preferred']),responsibilitiesSection=section(source,['Responsibilities','What You Will Do','What you will do','Duties','Key Responsibilities']),skillsSection=section(source,['Skills','Core Competencies','Technical Skills']);const lines=(requirementsSection||source).split(/\r?\n/).map(x=>x.replace(/^\s*[-•*\d.)]+\s*/,'').trim()).filter(x=>x.length>=(requirementsSection?2:8)&&x.length<=500);const requirementLines=(requirementsSection?cleanList(lines,40,500):unique(lines.filter(x=>/\b(required|minimum|must|experience|degree|certificate|certification|proficien|knowledge|skill|ability|license|licence|years?)\b/i.test(x))).slice(0,40));const preferred=cleanList((preferredSection||'').split(/\r?\n/),30,500);const responsibilities=cleanList((responsibilitiesSection||'').split(/\r?\n/),50,500);const skills=topKeywordsText([source,skillsSection].join(' '),50);const education=educationSignals(source);const years=explicitYears(source);const warnings:string[]=[];if(!requirementLines.length)warnings.push('No explicit requirements section was detected. Review and add must-have criteria manually so ATS scoring does not rely only on broad job-description language.');if(sensitiveSegments.length)warnings.push(`${sensitiveSegments.length} sensitive/protected-trait criterion or segment was excluded from ATS requirement extraction. Review the job description for lawful, job-related criteria.`);return{requirements:requirementLines,preferredQualifications:preferred,responsibilities,skills,educationSignals:education,requiredYears:years,warnings};
}
function topKeywordsText(text:string,limit:number){const freq=new Map<string,number>();for(const t of terms(text)){const k=stem(t);freq.set(k,(freq.get(k)||0)+1)}return unique([...aliasSignals(text),...[...freq.entries()].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length).map(x=>x[0])]).slice(0,limit)}
