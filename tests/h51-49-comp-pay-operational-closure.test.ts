import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('H51.49 Compensation + Payroll Operational Closure', () => {
  it('adds action-oriented payroll operational workflows', () => {
    const ui = readFileSync('src/components/payroll-operational-closure.tsx', 'utf8');
    for (const text of [
      'Configure UAT provider',
      'Payroll Profile Review',
      'Pay Calendar Manager',
      'Create retro case',
      'Variable Compensation Workflow',
      'Specialized / Off-Cycle Payroll',
      'Variance Investigation',
    ]) expect(ui).toContain(text);
  });

  it('supports organization, org-unit, pay-group and worker calendar scopes', () => {
    const ui = readFileSync('src/components/payroll-operational-closure.tsx', 'utf8');
    for (const scope of ['organization','org_unit','pay_group','worker']) expect(ui).toContain(`value="${scope}"`);
    expect(ui).toContain('exact run override → worker rule → pay group → org unit → organization calendar');
  });

  it('provides governed retro and variable-pay lifecycle actions', () => {
    const ui = readFileSync('src/components/payroll-operational-closure.tsx', 'utf8');
    expect(ui).toContain("operation: 'submit'");
    expect(ui).toContain("operation: 'approve'");
    expect(ui).toContain("operation: 'reject'");
    expect(ui).toContain("operation: 'prepare'");
  });

  it('provides specialized payroll run creation from the UI', () => {
    const ui = readFileSync('src/components/payroll-operational-closure.tsx', 'utf8');
    for (const kind of ['off_cycle','correction','termination','bonus','commission','emergency','retro']) expect(ui).toContain(kind);
    expect(ui).toContain("action: 'create_special_run'");
  });

  it('adds one authoritative compensation readiness presentation', () => {
    const ui = readFileSync('src/components/compensation-operational-closure.tsx', 'utf8');
    expect(ui).toContain('Authoritative Readiness Metrics');
    expect(ui).toContain('Employee band mappings missing');
    expect(ui).toContain('Architecture: {readiness.health.architecturePct}%');
  });

  it('adds direct worker remediation CTAs', () => {
    const ui = readFileSync('src/components/compensation-operational-closure.tsx', 'utf8');
    for (const text of ['Add position','Add compensation','Map band','Review payroll profile','Review sync']) expect(ui).toContain(text);
  });

  it('adds visible compensation change workflow actions', () => {
    const ui = readFileSync('src/components/compensation-operational-closure.tsx', 'utf8');
    for (const text of ['Create Compensation Change','Submit','Send to HR','Approve','Reject','Apply when effective']) expect(ui).toContain(text);
    expect(ui).toContain('Remaining-year');
    expect(ui).toContain('First payroll');
  });

  it('reviews compensation-payroll sync without silently changing pay', () => {
    const service = readFileSync('src/lib/compensation/operational-closure.ts', 'utf8');
    expect(service).toContain("status: 'reviewed'");
    expect(service).toContain('compensation.payroll_sync.review');
    expect(service).not.toContain('await compRef.set');
  });

  it('adds responsive no-wrap money presentation', () => {
    const payroll = readFileSync('src/components/payroll-operational-closure.tsx', 'utf8');
    const comp = readFileSync('src/components/compensation-operational-closure.tsx', 'utf8');
    expect(payroll).toContain("overflowX: 'auto'");
    expect(payroll).toContain("whiteSpace: 'nowrap'");
    expect(comp).toContain("overflowX: 'auto'");
    expect(comp).toContain("whiteSpace: 'nowrap'");
  });

  it('keeps country-specific compliance out of generic payroll operations', () => {
    const payroll = readFileSync('src/components/payroll-operational-closure.tsx', 'utf8');
    expect(payroll).not.toContain('GOSI');
    expect(payroll).not.toContain('SANED');
    expect(payroll).not.toContain('OntarioCompliance');
  });
});