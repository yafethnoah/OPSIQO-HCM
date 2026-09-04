import type { ActorContext } from '@/domain/security';
import type { ManagerCopilotDashboard } from '@/domain/opsiqo-one-v7-11';
import { ApiError } from '@/lib/http/errors';
import { superAppDashboard } from '@/lib/superapp/service';

export async function managerCopilot(actor:ActorContext):Promise<ManagerCopilotDashboard>{
  if(!actor.permissions.includes('team.read'))throw new ApiError(403,'Manager team access required.','forbidden');
  const d=await superAppDashboard(actor),m=d.manager;
  const priorities=d.attention.slice(0,10).map(x=>({title:x.title,summary:x.summary,severity:x.severity,href:x.href,dueAt:x.dueAt}));
  const prep=['Review current agreed goals and outstanding commitments.','Check upcoming deadlines, learning requirements and approved leave that affect work planning.','Recognize recent documented achievements and discuss blockers.','Capture agreed follow-ups; do not record sensitive personal information unless necessary and authorized.'];
  const suggested=[
    ...(m?.pendingLeaveApprovals?[{label:'Review leave approvals',href:'/time',reason:`${m.pendingLeaveApprovals} request(s) awaiting manager action.`}]:[]),
    ...(m?.awaitingManagerReviews?[{label:'Prepare performance reviews',href:'/performance',reason:`${m.awaitingManagerReviews} manager review(s) waiting.`}]:[]),
    ...(m?.overdueLearning?[{label:'Review team learning',href:'/learning',reason:`${m.overdueLearning} overdue learning assignment(s).`}]:[]),
    {label:'Ask HR',href:'/experience',reason:'Escalate matters that require HR interpretation or support.'},
  ];
  return{managerWorkerId:actor.workerId,teamSize:m?.teamSize||d.team.length,priorities,team:d.team,oneOnOnePreparation:prep,suggestedActions:suggested,generatedAt:new Date().toISOString(),governanceNotice:'Manager Copilot summarizes authorized operational HR evidence. It must not infer health, personality, protected traits or hidden attrition risk, and it does not make performance, discipline, promotion or compensation decisions.'};
}
