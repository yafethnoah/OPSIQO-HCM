import type { ActorContext } from '@/domain/security';
import type { AutonomyDecision, AutonomyLevel, IntelligenceRisk } from '@/domain/intelligence-control-plane';

const CONSEQUENTIAL=[/\bhire\b/i,/reject.*candidate/i,/terminat/i,/dismiss/i,/disciplin/i,/promot/i,/demot/i,/compensation/i,/salary/i,/pay change/i,/layoff/i,/redundan/i,/accommodation/i,/medical/i,/legal conclusion/i,/successor selection/i,/performance rating/i,/final finding/i];
const HIGH=[/access grant/i,/identity provision/i,/policy publish/i,/payroll/i,/finance/i,/bank/i,/security privilege/i,/external send/i];
const LOW_REVERSIBLE=[/notify/i,/remind/i,/create (draft|task|review)/i,/schedule/i,/route/i,/assign training/i,/request acknowledgement/i,/prepare/i];
function riskFromText(text:string):IntelligenceRisk{if(CONSEQUENTIAL.some(p=>p.test(text)))return'consequential';if(HIGH.some(p=>p.test(text)))return'high';if(LOW_REVERSIBLE.some(p=>p.test(text)))return'low';return'moderate';}
export function evaluateAutonomy(actor:ActorContext,input:{actionType:string;description?:string;reversible:boolean;preauthorized?:boolean;dataSensitivity?:'public'|'internal'|'confidential'|'restricted';financialImpact?:number;segregationOfDuties?:boolean;employmentConsequence?:boolean}):AutonomyDecision{
  const text=`${input.actionType} ${input.description||''}`,risk=input.employmentConsequence?'consequential':riskFromText(text);let level:AutonomyLevel=1,allowed=true,humanCheckpoint=false,humanDecisionRequired=false,reason='AI may prepare a draft or recommendation for human review.';
  if(risk==='consequential'){level=4;allowed=false;humanCheckpoint=true;humanDecisionRequired=true;reason='Consequential employment or legal decisions require authorized human judgment; AI execution is prohibited.';}
  else if(risk==='high'||!input.reversible||input.dataSensitivity==='restricted'||(input.financialImpact||0)>0||input.segregationOfDuties){level=3;humanCheckpoint=true;reason='High-impact, non-reversible, restricted-data, financial, or segregation-of-duties work requires a human checkpoint.';}
  else if(input.reversible&&input.preauthorized&&risk==='low'){level=2;humanCheckpoint=false;reason='Low-risk reversible action may execute only under organization pre-authorization and authoritative service controls.';}
  else if(risk==='low'||risk==='moderate'){level=1;humanCheckpoint=true;}
  if(!actor.permissions.includes('ai.use'))return{level:0,risk,allowed:false,reason:'Actor lacks AI use permission.',humanCheckpoint:false,humanDecisionRequired:false,reversible:input.reversible,segregationOfDutiesRequired:Boolean(input.segregationOfDuties)};
  return{level,risk,allowed,reason,humanCheckpoint,humanDecisionRequired,reversible:input.reversible,segregationOfDutiesRequired:Boolean(input.segregationOfDuties)};
}
