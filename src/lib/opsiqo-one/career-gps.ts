import type { ActorContext } from '@/domain/security';
import type { CareerGpsDashboard, CareerGpsRoadmapStep, EvidenceBand } from '@/domain/opsiqo-one-v7-12';
import { ApiError } from '@/lib/http/errors';
import { careerDashboard } from '@/lib/career/service';
import { learningDashboard } from '@/lib/learning/service';

const now=()=>new Date().toISOString();
function band(score?:number):EvidenceBand{return typeof score!=='number'?'unavailable':score>=80?'strong':score>=60?'developing':'exploratory'}

export async function careerGps(actor:ActorContext,targetPositionId?:string):Promise<CareerGpsDashboard>{
  if(!actor.permissions.includes('career.read'))throw new ApiError(403,'Career access required.','forbidden');
  if(!actor.workerId)throw new ApiError(409,'Career GPS requires a membership linked to a worker record.','worker_link_required');
  const career=await careerDashboard(actor);
  const worker=career.workerDirectory.find(w=>w.id===actor.workerId);
  if(!worker)throw new ApiError(404,'Your worker record is not available in the current career scope.','worker_not_found');
  const profile=career.profiles.find(p=>p.workerId===actor.workerId);
  const targetMap=new Map<string,{id:string;title:string;positionCode:string;location?:string;source:'profile'|'opportunity'}>();
  for(const id of profile?.targetPositionIds||[]){const p=career.positionDirectory.find(x=>x.id===id);if(p)targetMap.set(id,{id:p.id,title:p.title,positionCode:p.positionCode,location:p.location,source:'profile'});}
  for(const o of career.opportunities){if(!targetMap.has(o.positionId))targetMap.set(o.positionId,{id:o.positionId,title:o.positionTitle,positionCode:o.positionCode,location:o.location,source:'opportunity'});}
  const availableTargets=[...targetMap.values()];
  const selectedId=targetPositionId||profile?.targetPositionIds[0]||career.opportunities[0]?.positionId;
  if(selectedId&&!career.positionDirectory.some(p=>p.id===selectedId))throw new ApiError(404,'Target position not found.','position_not_found');
  const target=selectedId?career.positionDirectory.find(p=>p.id===selectedId):undefined;
  const readiness=selectedId?(career.readiness.find(r=>r.workerId===actor.workerId&&r.positionId===selectedId)||career.opportunities.find(o=>o.positionId===selectedId)?.readiness):undefined;
  const learning=actor.permissions.includes('learning.read')?await learningDashboard(actor):undefined;
  const missingSkills=readiness?.evidence.missingSkills.map(s=>({skillId:s.skillId,skillName:s.skillName,requiredLevel:s.requiredLevel,verifiedLevel:s.verifiedLevel,criticality:s.criticality}))||[];
  const missingIds=new Set(missingSkills.map(s=>s.skillId));
  const recommendedCourses=(learning?.courses||[]).filter(c=>c.status==='published'&&c.skillMappings.some(m=>missingIds.has(m.skillId))).map(c=>({id:c.id,code:c.code,title:c.title,skillIds:c.skillMappings.filter(m=>missingIds.has(m.skillId)).map(m=>m.skillId),durationMinutes:c.durationMinutes})).slice(0,8);
  const currentPosition=worker.primaryPositionId?career.positionDirectory.find(p=>p.id===worker.primaryPositionId):undefined;
  const roadmap:CareerGpsRoadmapStep[]=[];
  if(!profile)roadmap.push({id:'profile',category:'review',title:'Create your career profile',rationale:'Career GPS needs your human-entered aspirations and mobility preferences before it can personalize development guidance.',href:'/career',priority:'high'});
  if(readiness&&!readiness.scoreAvailable)roadmap.push({id:'evidence',category:'evidence',title:'Improve readiness evidence coverage',rationale:`Only ${readiness.evidence.evidenceCompletenessPct}% of the configured readiness evidence is currently available.`,href:'/career',priority:'high'});
  for(const s of missingSkills.slice(0,5))roadmap.push({id:`skill:${s.skillId}`,category:'skill',title:`Build or verify ${s.skillName}`,rationale:`Target role requires level ${s.requiredLevel}; verified evidence currently supports level ${s.verifiedLevel}.`,href:'/learning',priority:s.criticality==='required'?'high':'medium'});
  if(recommendedCourses.length)roadmap.push({id:'learning',category:'learning',title:'Review targeted learning options',rationale:`${recommendedCourses.length} published course(s) map to currently evidenced target-role skill gaps.`,href:'/learning',priority:'medium'});
  roadmap.push({id:'experience',category:'experience',title:'Discuss development experience with your manager',rationale:'Projects, stretch assignments and mentoring should be agreed by people—not inferred or assigned automatically by AI.',href:'/career',priority:'medium'});
  roadmap.push({id:'review',category:'review',title:'Re-check readiness after new evidence',rationale:'Readiness updates when verified skills, relevant learning or authorized performance evidence changes.',href:'/career-gps',priority:'low'});
  return{worker:{id:worker.id,displayName:worker.displayName,currentPositionId:worker.primaryPositionId,currentPositionTitle:currentPosition?.title},profileConfigured:Boolean(profile),targetPosition:target?{id:target.id,title:target.title,positionCode:target.positionCode,location:target.location}:undefined,availableTargets,readiness:{available:Boolean(readiness?.scoreAvailable),overallScore:readiness?.overallScore,evidenceBand:band(readiness?.overallScore),verifiedSkillCoveragePct:readiness?.evidence.verifiedSkillCoveragePct,evidenceCompletenessPct:readiness?.evidence.evidenceCompletenessPct,performanceEvidenceAvailable:typeof readiness?.evidence.latestPerformanceRating==='number',relevantLearningCompleted:readiness?.evidence.relevantLearningCompleted||0,relevantLearningTotal:readiness?.evidence.relevantLearningTotal||0},missingSkills,recommendedCourses,developmentPriorities:profile?.developmentPriorities||[],roadmap,generatedAt:now(),governanceNotice:'Career GPS is employee development decision support. Readiness is evidence coverage against configured role requirements—not a promotion, hiring, succession or compensation decision. OPSIQO does not infer protected traits or guarantee a future role.'};
}
