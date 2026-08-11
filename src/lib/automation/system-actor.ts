import type { ActorContext } from '@/domain/security';
import { permissionsForRole } from '@/lib/auth/permissions';

export function systemActor(orgId: string, uid = 'system:phase1-automation'): ActorContext {
  return {
    uid,
    orgId,
    role: 'super_admin',
    permissions: permissionsForRole('super_admin'),
  };
}
