import { describe,expect,it } from 'vitest';
import type { ActorContext,Permission } from '@/domain/security';
import catalog from '@/lib/opsiqo-one/legacy-surface-translations-v7-21.json';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { SAFE_EXECUTION_ALLOWLIST } from '@/lib/opsiqo-one/safe-execution';
import { translationReadinessDashboard } from '@/lib/opsiqo-one/translation-readiness';
function actor(role:ActorContext['role'],permissions:Permission[]):ActorContext{return{uid:'u1',orgId:'o1',role,workerId:'w1',permissions}}

describe('OPSIQO ONE v7.21 document policy learning knowledge hardening',()=>{
  it('extends reviewed exact-string translation to fifteen governed surfaces',()=>{
    expect(Object.keys(catalog).sort()).toEqual(['compensation','compliance','compliance_radar','employee_service','experience','learning','notifications','performance','policy_intelligence','recruiting','settings','setup','signin','time','workflows']);
    for(const key of ['compliance','experience','workflows'] as const){
      expect(Object.keys(catalog[key].translations).length).toBeGreaterThan(40);
      for(const t of Object.values(catalog[key].translations))expect(Boolean(t.fr&&t.es&&t.ar)).toBe(true);
    }
  });
  it('preserves the V7.21 reviewed-coverage floor while later releases may close the backlog',()=>{
    const d=translationReadinessDashboard(actor('employee',['self.read']));
    expect(d.reviewedSourceCandidates).toBeGreaterThanOrEqual(600);
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
