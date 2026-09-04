import type { ActorContext } from '@/domain/security';
import type { EmployeeConciergeDashboard } from '@/domain/opsiqo-one-v7-11';
import { superAppDashboard } from '@/lib/superapp/service';
import { experienceDashboard } from '@/lib/experience/service';

export async function employeeConcierge(actor:ActorContext):Promise<EmployeeConciergeDashboard>{
  const [home,experience]=await Promise.all([superAppDashboard(actor),experienceDashboard(actor).catch(()=>null)]),e=home.employee;
  const actions=[
    {label:'Request time off',description:'Prepare a governed leave request with your employee context.',href:'/time',permission:'leave.request'},
    {label:'Get an employment letter',description:'Open HR Service Center and request an employment confirmation letter.',href:'/experience',permission:'service.request'},
    {label:'Ask about a policy',description:'Ask OPSIQO using governed organizational evidence and citations.',href:'/ai-copilot',permission:'ai.use'},
    {label:'Review my learning',description:'See courses, skills and certification evidence available to you.',href:'/learning',permission:'learning.read'},
  ].filter(x=>!x.permission||actor.permissions.includes(x.permission as never));
  return{employee:{displayName:e.worker?.displayName||'Employee',position:e.assignment?.positionTitle,orgUnit:e.assignment?.orgUnitName,manager:e.assignment?.managerName,linked:e.linked},services:(experience?.catalog||[]).filter(x=>x.enabled).slice(0,12).map(x=>({id:x.id,code:x.code,name:x.name,description:x.description,category:x.category})),knowledge:(experience?.knowledge||[]).slice(0,12).map(x=>({id:x.id,title:x.title,summary:x.summary,category:x.category})),quickActions:actions,openHrRequests:e.service.openTickets,pendingLeaveRequests:e.leave.pendingRequests,leaveAvailableHours:e.leave.availableHours,generatedAt:new Date().toISOString(),privacyNotice:'Employee Concierge uses only your authenticated organization membership, worker link and permission-scoped services. It does not expose other employees’ private records.'};
}
