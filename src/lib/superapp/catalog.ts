import type { ActorContext } from '@/domain/security';
import type { SuperAppAction } from '@/domain/superapp';

const HR_ROLES=['super_admin','org_admin','hr_admin','hr_partner'];
export const SUPERAPP_ACTIONS:SuperAppAction[]=[
 {id:'my_profile',label:'My HR',description:'Profile, assignment and employment history',href:'/self-service',permission:'self.read',audience:'all',category:'work'},
 {id:'time_leave',label:'Time & Leave',description:'Clock, timesheets, leave balances and requests',href:'/time',permission:'time.read',audience:'all',category:'work'},
 {id:'documents',label:'My Documents',description:'View HR documents available to you',href:'/compliance',permission:'documents.read',audience:'all',category:'work'},
 {id:'policies',label:'Policies & Compliance',description:'Acknowledgements and compliance requirements',href:'/compliance',permission:'compliance.read',audience:'all',category:'work'},
 {id:'learning',label:'Learning',description:'Courses, skills and certificates',href:'/learning',permission:'learning.read',audience:'all',category:'growth'},
 {id:'career',label:'Career',description:'Career paths and development',href:'/career',permission:'career.read',audience:'all',category:'growth'},
 {id:'performance',label:'Performance',description:'Goals, reviews and development plans',href:'/performance',permission:'performance.read',audience:'all',category:'growth'},
 {id:'compensation',label:'Pay & Rewards',description:'Compensation and total rewards',href:'/compensation',permission:'compensation.read',audience:'all',category:'pay'},
 {id:'hr_help',label:'HR Help',description:'Service requests, knowledge and employee experience',href:'/experience',permission:'service.read',audience:'all',category:'help'},
 {id:'notifications',label:'Notifications',description:'Your OPSIQO alerts and reminders',href:'/notifications',permission:'notifications.read',audience:'all',category:'work'},
 {id:'safety',label:'Safety',description:'Report or review workplace safety matters',href:'/safety',permission:'safety.report',audience:'all',category:'help'},
 {id:'contract_import',label:'Contract Import',description:'Parse an employment contract into a verified HR data draft',href:'/contract-import',permission:'documents.read',roles:HR_ROLES,audience:'all',category:'work'},
 {id:'manager_team',label:'My Team',description:'Direct reports and team structure',href:'/manager',permission:'team.read',audience:'manager',category:'team'},
 {id:'team_leave',label:'Team Leave',description:'Review team leave and approvals',href:'/time',permission:'leave.approve',audience:'manager',category:'approvals'},
 {id:'team_time',label:'Timesheet Approvals',description:'Review submitted team timesheets',href:'/time',permission:'time.approve',audience:'manager',category:'approvals'},
 {id:'team_performance',label:'Team Performance',description:'Manager reviews, goals and check-ins',href:'/performance',permission:'performance.review',audience:'manager',category:'approvals'},
 {id:'team_learning',label:'Team Learning',description:'Assignments, skills and verification',href:'/learning',permission:'learning.assign',audience:'manager',category:'team'},
 {id:'recruiting',label:'Recruiting',description:'Requisitions, interviews and candidate work',href:'/recruiting',permission:'recruiting.read',audience:'manager',category:'team'},
 {id:'onboarding',label:'Onboarding',description:'New-hire onboarding work',href:'/onboarding',permission:'onboarding.read',audience:'manager',category:'team'},
 {id:'manager_comp',label:'Compensation',description:'Team compensation views and cycle work',href:'/compensation',permission:'compensation.read',audience:'manager',category:'team'},
 {id:'ai_copilot',label:'AI HR Copilot',description:'Evidence-first governed HR intelligence',href:'/ai-copilot',permission:'ai.use',audience:'manager',category:'ai'}
];

export function visibleSuperAppActions(actor:ActorContext,mode:'employee'|'manager'){
 return SUPERAPP_ACTIONS.filter(a=>{
  if(a.audience==='manager'&&mode!=='manager')return false;
  if(a.audience==='employee'&&mode!=='employee')return false;
  if(a.roles&&!a.roles.includes(actor.role))return false;
  return !a.permission||actor.permissions.includes(a.permission as any);
 });
}
