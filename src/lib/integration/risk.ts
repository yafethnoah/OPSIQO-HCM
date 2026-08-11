import type { IntegrationRisk } from '@/domain/integration';
export const bounded=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
export function integrationRisk(readiness:number,deadLetters:number,variances:number,failing:number):IntegrationRisk{
  if(failing>0||deadLetters>=10||variances>=5||readiness<45)return 'critical';
  if(deadLetters>0||variances>1||readiness<65)return 'high';
  if(variances>0||readiness<80)return 'medium';
  return 'low';
}
export function integrationReadiness(input:{active:number;approved:number;failing:number;failedRuns:number;deadLetters:number;variances:number;successRate:number;openCircuits?:number;overdueSchedules?:number;rejectedWebhooks?:number}){
  let score=100;
  if(input.approved===0)score-=20;
  if(input.active===0&&input.approved>0)score-=10;
  score-=Math.min(30,input.failing*15);
  score-=Math.min(20,input.failedRuns*4);
  score-=Math.min(20,input.deadLetters*2);
  score-=Math.min(20,input.variances*5);
  score-=Math.min(20,(input.openCircuits||0)*10);
  score-=Math.min(15,(input.overdueSchedules||0)*5);
  score-=Math.min(10,(input.rejectedWebhooks||0)*2);
  if(input.successRate<99)score-=Math.min(20,Math.round((99-input.successRate)*2));
  const s=bounded(score),level=s>=90?'resilient':s>=75?'controlled':s>=55?'developing':'fragile';
  return {score:s,level:level as 'fragile'|'developing'|'controlled'|'resilient'};
}
