import { randomUUID } from 'crypto';
import type { ActorContext } from '@/domain/security';
import type { OpsiQoCommandResult } from '@/domain/opsiqo-one';
import type { SafeExecutionReceipt } from '@/domain/opsiqo-one-v7-16';
import { ApiError } from '@/lib/http/errors';
import { markVisibleNotificationsRead } from '@/lib/notifications/service';

export const SAFE_EXECUTION_ALLOWLIST=[{
  id:'notifications.mark_visible_read',
  title:'Mark my visible notifications read',
  requiredPermissions:['notifications.read'],
  risk:'low' as const,
  actionLevel:'execute' as const,
}];

export async function executeSafeOpsiQoAction(actor:ActorContext,routed:OpsiQoCommandResult):Promise<SafeExecutionReceipt>{
  if(routed.mode!=='execute'||routed.title!=='Mark my visible notifications read')throw new ApiError(400,'This OPSIQO command is not in the low-risk execution allowlist.','opsiqo_safe_action_not_allowed');
  if(!actor.permissions.includes('notifications.read'))throw new ApiError(403,'Notification read permission required.','forbidden');
  const result=await markVisibleNotificationsRead(actor,100);
  return{id:randomUUID(),action:'notifications.mark_visible_read',actionLevel:'execute',risk:'low',affectedCount:result.affectedCount,executedBy:actor.uid,executedAt:result.completedAt,evidence:['Authenticated organization membership','notifications.read permission','Visibility-scoped notification query','Authoritative notification service audit'],humanDecisionRequired:false,boundary:'Only unread notifications explicitly targeted to the signed-in actor were marked read; role-wide/shared notifications were not changed. No employment, payroll, approval, personnel, workflow or security record was changed.'};
}
