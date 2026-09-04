import type { ExecutionUatDashboard } from '@/domain/opsiqo-one-v7-18';
export function executionUatDashboard():ExecutionUatDashboard{
  return{
    currentActionId:'notifications.mark_visible_read',
    implementationGates:[
      {id:'allowlist-exact',title:'Exact allowlist match',status:'implementation_pass',evidence:'Safe execution rejects any routed action other than notifications.mark_visible_read.'},
      {id:'permission-recheck',title:'Permission recheck',status:'implementation_pass',evidence:'notifications.read is rechecked inside the executor before the authoritative service is called.'},
      {id:'self-target-only',title:'Direct-user scope',status:'implementation_pass',evidence:'The authoritative notification service mutates only unread records explicitly targeted to the signed-in uid.'},
      {id:'shared-role-isolation',title:'Shared-role isolation',status:'implementation_pass',evidence:'Role-wide/shared notifications are not marked read by the self-service Execute action.'},
      {id:'batch-cap',title:'Bounded mutation',status:'implementation_pass',evidence:'The action uses a hard batch cap of 100 records per command.'},
      {id:'consequential-precedence',title:'Consequential firewall precedence',status:'implementation_pass',evidence:'Consequential employment patterns are evaluated before the safe Execute route.'},
      {id:'authoritative-service',title:'Authoritative domain service',status:'implementation_pass',evidence:'The command layer delegates to the notification service rather than writing Firestore directly.'},
    ],
    browserGates:[
      {id:'multi-user-isolation',title:'Two-user isolation',status:'browser_uat_required',evidence:'Verify in emulator/UAT that one user cannot change another user’s direct or role-wide notification state.'},
      {id:'retry-reconciliation',title:'Retry and reconciliation',status:'browser_uat_required',evidence:'Exercise network interruption/retry and confirm the UI reconciles with authoritative notification state.'},
      {id:'screen-reader-feedback',title:'Accessible execution feedback',status:'browser_uat_required',evidence:'Verify completion/error status is announced without unexpected focus movement.'},
      {id:'locale-feedback',title:'Multilingual execution feedback',status:'browser_uat_required',evidence:'Verify the action and receipt remain understandable in English, French, Spanish and Arabic.'},
    ],
    expansionStatus:'hold',candidateActionIds:['preference.locale.update','preference.appearance.update'],generatedAt:new Date().toISOString(),
    boundary:'V7.19 still does not add a second Execute action. No dependency-backed multi-user/browser UAT evidence was supplied for promotion, so expansion remains on hold even though candidate preference actions are technically reversible.',
  };
}
