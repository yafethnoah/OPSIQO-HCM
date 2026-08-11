import type { AiCopilotAnswer, AiEvidenceItem, AiRecommendationType } from '@/domain/ai-intelligence';

const prohibited:[RegExp,string][]=[
 [/^\s*(fire|terminate|dismiss|lay off|promote|hire|reject|discipline)\b/i,'AI cannot execute or recommend a consequential individual employment action.'],
 [/^\s*(give|grant|award).{0,80}\b(raise|bonus|salary increase|pay increase)\b/i,'AI cannot determine an individual compensation outcome.'],
 [/^\s*put.{0,80}\b(on )?(a )?(PIP|performance improvement plan)\b/i,'AI cannot determine a PIP outcome.'],
 [/\b(who|which employee|which worker).{0,80}\b(fire|terminate|lay off|dismiss)\b/i,'AI cannot select employees for termination or layoff.'],
 [/\b(should|recommend|decide|tell me whether).{0,100}\b(fire|terminate|lay off|dismiss)\b/i,'AI cannot recommend an individual termination or layoff decision.'],
 [/\b(who|which employee|which worker|best person).{0,80}\b(promote|promotion|successor)\b/i,'AI cannot select employees for promotion or succession decisions.'],
 [/\b(should|recommend|suitable|ready).{0,100}\b(promot|successor)\w*\b/i,'AI cannot determine an individual promotion or succession outcome.'],
 [/\b(who|which employee|which worker).{0,80}\b(pay|raise|bonus|salary increase|compensation)\b/i,'AI cannot select employees for compensation decisions.'],
 [/\b(should|deserve|recommend).{0,100}\b(raise|bonus|salary increase|pay increase|compensation increase)\b/i,'AI cannot determine an individual compensation outcome.'],
 [/\b(who|which candidate|which applicant|best candidate|rank (the )?candidates?|rank (the )?applicants?).{0,100}\b(hire|reject|select|best|top|rank)\b/i,'AI cannot rank or select candidates for hiring or rejection.'],
 [/\b(discipline|disciplinary action|punish|performance improvement plan|PIP)\b.{0,100}\b(employee|worker|person|him|her|them)\b|\b(employee|worker|person|him|her|them)\b.{0,100}\b(discipline|disciplinary action|punish|performance improvement plan|PIP)\b/i,'AI cannot determine disciplinary or PIP outcomes.'],
 [/\b(deny|refuse|approve).{0,60}\b(accommodation|protected leave|disability leave)\b/i,'AI cannot determine accommodation or protected-leave eligibility/outcomes.'],
 [/\b(who|which employee|which worker).{0,100}\b(flight risk|likely to (quit|leave|resign|retire)|retirement risk|attrition risk)\b/i,'AI cannot generate individual attrition or retirement-risk scores.'],
 [/\b(rate|score|calibrate).{0,80}\b(employee|worker|person).{0,60}\b(performance|rating)\b/i,'AI cannot assign an individual performance rating.'],
];
export function blockedUse(question:string){for(const[p,reason]of prohibited)if(p.test(question))return reason;return undefined;}
export function evidenceCompleteness(evidence:AiEvidenceItem[]){if(!evidence.length)return 0;const withQuality=evidence.filter(e=>e.dataQuality).length;const recent=evidence.filter(e=>Date.now()-new Date(e.asOf).getTime()<120*86400000).length;return Math.round(Math.min(100,55+25*recent/evidence.length+20*withQuality/evidence.length));}
export function validateAnswer(answer:AiCopilotAnswer,evidence:AiEvidenceItem[]):AiCopilotAnswer{const allowed=new Set(evidence.map(e=>e.id));const citations=answer.citations.filter(c=>allowed.has(c.evidenceId));const recommendations=answer.recommendations.map(r=>({...r,evidenceIds:r.evidenceIds.filter(id=>allowed.has(id))})).filter(r=>r.evidenceIds.length>0&&!blockedUse(`${r.title} ${r.rationale}`));const completion=evidenceCompleteness(evidence);const confidence=Math.max(0,Math.min(100,Math.round(Math.min(answer.confidence||0,completion,citations.length?95:35))));return{...answer,citations,recommendations,confidence,evidenceCompleteness:completion,limitations:[...new Set([...(answer.limitations||[]),...(citations.length<answer.citations.length?['One or more model citations were discarded because they did not match retrieved OPSIQO evidence.']:[]),'Citation IDs are validated for source existence; claim entailment still requires human review when consequential.'])]};}
export const allowedRecommendationTypes=new Set<AiRecommendationType>(['investigate','review','analyze','communicate','plan','monitor']);
