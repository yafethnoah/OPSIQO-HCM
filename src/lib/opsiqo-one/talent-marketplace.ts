import type { ActorContext } from '@/domain/security';
import type { EvidenceBand, TalentMarketplaceDashboard, TalentMarketplaceOpportunity } from '@/domain/opsiqo-one-v7-12';
import { ApiError } from '@/lib/http/errors';
import { careerDashboard } from '@/lib/career/service';

const now=()=>new Date().toISOString();
function band(score?:number):EvidenceBand{return typeof score!=='number'?'unavailable':score>=80?'strong':score>=60?'developing':'exploratory'}
const order:Record<EvidenceBand,number>={strong:0,developing:1,exploratory:2,unavailable:3};

export async function talentMarketplace(actor:ActorContext):Promise<TalentMarketplaceDashboard>{
  if(!actor.permissions.includes('career.read'))throw new ApiError(403,'Career access required.','forbidden');
  const dashboard=await careerDashboard(actor),worker=actor.workerId?dashboard.workerDirectory.find(w=>w.id===actor.workerId):undefined;
  const opportunities:TalentMarketplaceOpportunity[]=dashboard.opportunities.map(o=>{
    const r=o.readiness,required=r?.evidence.requiredSkillCount,missing=r?.evidence.missingSkills||[];
    return{positionId:o.positionId,positionTitle:o.positionTitle,positionCode:o.positionCode,location:o.location,requisitionId:o.requisitionId,requisitionNumber:o.requisitionNumber,evidenceBand:band(r?.overallScore),readinessScore:r?.overallScore,verifiedSkillCoveragePct:r?.evidence.verifiedSkillCoveragePct,evidenceCompletenessPct:r?.evidence.evidenceCompletenessPct,matchedSkillCount:typeof required==='number'?Math.max(0,required-missing.length):undefined,requiredSkillCount:required,missingSkills:missing.map(s=>s.skillName),interestStatus:o.interest?.status,actionHref:'/career'};
  }).sort((a,b)=>order[a.evidenceBand]-order[b.evidenceBand]||(b.readinessScore||0)-(a.readinessScore||0));
  return{workerLinked:Boolean(worker),worker:worker?{id:worker.id,displayName:worker.displayName,employeeNumber:worker.employeeNumber}:undefined,opportunities,metrics:{openOpportunities:opportunities.length,strongMatches:opportunities.filter(o=>o.evidenceBand==='strong').length,developingMatches:opportunities.filter(o=>o.evidenceBand==='developing').length,expressedInterests:opportunities.filter(o=>['interested','applied'].includes(o.interestStatus||'')).length},generatedAt:now(),governanceNotice:'The Talent Marketplace compares only the signed-in worker’s permission-available evidence with configured position requirements. It does not rank employees against one another, select candidates, promise eligibility, or make hiring/promotion decisions.'};
}
