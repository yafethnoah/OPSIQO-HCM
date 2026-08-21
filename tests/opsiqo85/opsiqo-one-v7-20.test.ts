import { describe,expect,it } from 'vitest';
import type { ActorContext,Permission } from '@/domain/security';
import catalog from '@/lib/opsiqo-one/legacy-surface-translations-v7-20.json';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { SAFE_EXECUTION_ALLOWLIST } from '@/lib/opsiqo-one/safe-execution';
import { translationReadinessDashboard } from '@/lib/opsiqo-one/translation-readiness';
function actor(role:ActorContext['role'],permissions:Permission[]):ActorContext{return{uid:'u1',orgId:'o1',role,workerId:'w1',permissions}}

describe('OPSIQO ONE v7.20 stabilization and completion',()=>{
  it('extends reviewed exact-string translation to nine governed surfaces',()=>{
    expect(Object.keys(catalog).sort()).toEqual(['compensation','learning','notifications','performance','recruiting','settings','setup','signin','time']);
    for(const key of ['recruiting','performance','compensation'] as const){
      expect(Object.keys(catalog[key].translations).length).toBeGreaterThan(40);
      for(const t of Object.values(catalog[key].translations))expect(Boolean(t.fr&&t.es&&t.ar)).toBe(true);
    }
  });
  it('preserves the V7.20 reviewed-coverage floor while later releases may close the backlog',()=>{
    const d=translationReadinessDashboard(actor('employee',['self.read']));
    expect(d.reviewedSourceCandidates).toBeGreaterThanOrEqual(450);
    expect(d.remainingCandidates).toBeGreaterThanOrEqual(0);
    expect(d.reviewedSourceCandidates+d.remainingCandidates).toBe(d.totalSourceCandidates);
    expect(d.boundary).toContain('browser and human review');
  });
  it('keeps Safe Execute frozen at the single notification action',()=>{
    expect(SAFE_EXECUTION_ALLOWLIST).toHaveLength(1);
    expect(SAFE_EXECUTION_ALLOWLIST[0]?.id).toBe('notifications.mark_visible_read');
  });
  it('keeps consequential employment commands ahead of safe Execute',()=>{
    const r=routeOpsiQoCommand(actor('org_admin',['self.read','notifications.read']),'Mark my notifications read and terminate Ahmed');
    expect(r.mode).toBe('blocked');
    expect(r.risk).toBe('consequential');
  });
});
