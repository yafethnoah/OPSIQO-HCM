import type { ExecutionReadinessDashboard } from '@/domain/opsiqo-one-v7-17';
export function executionReadinessDashboard():ExecutionReadinessDashboard{
 const generatedAt=new Date().toISOString();
 return{
  enabledActions:[{id:'notifications.mark_visible_read',title:'Mark my direct notifications read',status:'enabled',reason:'Low-risk, self-scoped, permission-rechecked, capped, audited and delegated to the authoritative notification service.'}],
  candidates:[
   {id:'preference.locale.update',title:'Change my interface language',status:'hold_for_uat',reason:'Potentially low-risk self-service, but V7.17 does not enable another Execute action until V7.16 Execute behavior is UAT-proven.'},
   {id:'preference.appearance.update',title:'Change my accessibility appearance preferences',status:'hold_for_uat',reason:'Potentially low-risk self-service, but requires explicit UAT evidence before entering the Execute allowlist.'},
  ],
  prohibited:[
   {id:'employment.decision',title:'Employment decisions',status:'prohibited',reason:'Termination, hiring/rejection, promotion/demotion, discipline, succession and other consequential employment decisions require meaningful human control.'},
   {id:'compensation.individual_change',title:'Individual compensation changes',status:'prohibited',reason:'Individual pay changes remain outside generic AI Execute.'},
   {id:'security.admin',title:'Security / tenant administration',status:'prohibited',reason:'Identity, security, role, tenant and workflow-activation administration remain outside the low-risk self-service executor.'},
  ],
  generatedAt,
  boundary:'V7.19 preserves the single V7.16 notification Execute action. Candidate locale/appearance actions remain on hold until dependency-backed multi-user, retry, accessibility and multilingual UAT evidence is captured.',
 };
}
