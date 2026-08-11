import { describe, expect, it } from 'vitest';
import { governanceRiskLevel } from '@/lib/governance/risk';
import { permissionsForRole } from '@/lib/auth/permissions';

describe('enterprise HR governance boundaries',()=>{
  it('maps risk score to deterministic level',()=>{
    expect(governanceRiskLevel(1)).toBe('low');
    expect(governanceRiskLevel(6)).toBe('medium');
    expect(governanceRiskLevel(12)).toBe('high');
    expect(governanceRiskLevel(20)).toBe('critical');
  });
  it('does not grant governance approval to HR Partner',()=>{
    const p=permissionsForRole('hr_partner');
    expect(p).toContain('governance.read');
    expect(p).toContain('governance.manage');
    expect(p).not.toContain('governance.approve');
  });
  it('grants governance approval to HR Admin',()=>{
    expect(permissionsForRole('hr_admin')).toContain('governance.approve');
  });
});
