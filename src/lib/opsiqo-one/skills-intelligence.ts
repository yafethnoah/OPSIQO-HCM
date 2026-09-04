import type { ActorContext } from '@/domain/security';
import type { SkillsPassportDashboard } from '@/domain/opsiqo-one-v7-12';
import { ApiError } from '@/lib/http/errors';
import { learningDashboard } from '@/lib/learning/service';

const now=()=>new Date().toISOString();

export async function skillsPassport(actor:ActorContext):Promise<SkillsPassportDashboard>{
  if(!actor.permissions.includes('learning.read'))throw new ApiError(403,'Skills and learning access required.','forbidden');
  if(!actor.workerId)throw new ApiError(409,'Your membership is not linked to a worker record.','worker_link_required');
  const dashboard=await learningDashboard(actor);
  const worker=dashboard.workerDirectory.find(w=>w.id===actor.workerId);
  if(!worker)throw new ApiError(404,'Your worker record is not available in the current learning scope.','worker_not_found');
  const skillMap=new Map(dashboard.skills.map(s=>[s.id,s]));
  const courseMap=new Map(dashboard.courses.map(c=>[c.id,c]));
  const rows=dashboard.workerSkills.filter(s=>s.workerId===actor.workerId).map(row=>{
    const skill=skillMap.get(row.skillId);
    const label=skill?.proficiencyLabels.find(x=>x.level===row.level)?.label||`Level ${row.level}`;
    const evidenceStatus=row.status==='expired'?'expired':['manager_verified','evidence_verified'].includes(row.status)?'verified':'self_reported';
    return{skillId:row.skillId,code:skill?.code||row.skillId,name:skill?.name||row.skillId,category:skill?.category,level:row.level,levelLabel:label,verificationStatus:row.status,evidenceStatus,assessedAt:row.assessedAt,expiresAt:row.expiresAt} as const;
  });
  const verifiedSkills=rows.filter(x=>x.evidenceStatus==='verified').sort((a,b)=>a.name.localeCompare(b.name));
  const selfReportedSkills=rows.filter(x=>x.evidenceStatus==='self_reported').sort((a,b)=>a.name.localeCompare(b.name));
  const expiredSkills=rows.filter(x=>x.evidenceStatus==='expired').sort((a,b)=>a.name.localeCompare(b.name));
  const totalCurrent=verifiedSkills.length+selfReportedSkills.length;
  const evidenceCoveragePct=totalCurrent?Math.round(verifiedSkills.length/totalCurrent*100):null;
  const currentRoleGaps=dashboard.gaps.filter(g=>g.workerId===actor.workerId).map(g=>({skillId:g.skillId,skillName:g.skillName,requiredLevel:g.requiredLevel,verifiedLevel:g.verifiedLevel,gap:g.gap,criticality:g.criticality,recommendedCourseIds:g.recommendedCourseIds}));
  const activeLearning=dashboard.assignments.filter(a=>a.workerId===actor.workerId&&['assigned','in_progress'].includes(a.status)).map(a=>({id:a.id,courseId:a.courseId,courseTitle:courseMap.get(a.courseId)?.title||a.courseId,status:a.status,progressPct:a.progressPct,dueAt:a.dueAt}));
  const certificates=dashboard.certificates.filter(c=>c.workerId===actor.workerId).map(c=>({id:c.id,courseTitle:courseMap.get(c.courseId)?.title||c.courseId,certificateNumber:c.certificateNumber,status:c.status,issuedAt:c.issuedAt,expiresAt:c.expiresAt})).sort((a,b)=>b.issuedAt.localeCompare(a.issuedAt));
  return{worker:{id:worker.id,displayName:worker.displayName,employeeNumber:worker.employeeNumber,status:worker.status},verifiedSkills,selfReportedSkills,expiredSkills,currentRoleGaps,activeLearning,certificates,evidenceCoveragePct,generatedAt:now(),governanceNotice:'The Skills Passport reports evidence already stored in OPSIQO. Self-reported skills are clearly separated from manager/evidence-verified records. It does not infer personality, aptitude, health, protected traits or employment suitability.'};
}
