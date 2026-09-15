import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read=(p:string)=>readFileSync(p,'utf8');

describe('H51.52 Payroll + Compensation UAT Closure & UX Cleanup', () => {
  it('removes the duplicate legacy compensation readiness cockpit', () => {
    const workspace=read('src/components/compensation-workspace.tsx');
    expect(workspace).not.toContain('<ReadinessCockpit/>');
    expect(workspace).not.toContain('function ReadinessCockpit()');
    expect(workspace).toContain('<CompensationOperationsCommandCenter/>');
  });

  it('preserves readiness remediation actions in the authoritative operational workspace', () => {
    const ui=read('src/components/compensation-operational-closure.tsx');
    expect(ui).toContain('Prepare compensation setup drafts');
    expect(ui).toContain('Prepare payroll-profile drafts');
    expect(ui).toContain("action:'prepare_compensation_drafts'");
    expect(ui).toContain("action:'prepare_payroll_drafts'");
  });

  it('uses worker-specific release terminology consistently', () => {
    const ui=read('src/components/payroll-workspace.tsx');
    expect(ui).not.toContain('Member-specific release dates');
    expect(ui).not.toContain('reviewed member release dates');
    expect(ui).toContain('worker-specific exact run overrides and governed calendar rules');
  });

  it('adds a live UAT closure evidence panel without enabling consequential actions', () => {
    const ui=read('src/components/payroll-operational-closure.tsx');
    expect(ui).toContain('Live UAT Closure Evidence');
    expect(ui).toContain('Explicit profile review');
    expect(ui).toContain('Governed calendar rules');
    expect(ui).toContain('Exact run override proof');
    expect(ui).toContain('Registered UAT provider');
    expect(ui).toContain('Comp → Payroll reviewed');
    expect(ui).toContain('Retro maker-checker proof');
    expect(ui).toContain('Variable-pay maker-checker proof');
    expect(ui).toContain('Pending means the control has not yet been proven by a live UAT transaction');
    expect(ui).toContain('payrollProfileExplicitlyReviewed');
    expect(ui).not.toContain('autoApprove');
    expect(ui).not.toContain('autoRelease');
  });

  it('refines sticky remediation UX without making the sticky action column excessively wide', () => {
    const css=read('src/app/globals.css');
    expect(css).toContain('H51.52 UAT closure + sticky table refinement');
    expect(css).toContain('scroll-padding-inline');
    expect(css).toContain('box-shadow');
    expect(css).toContain('.authorityStickyTable td:last-child .compPayActionRow');
    expect(css).toContain('flex-wrap:wrap');
  });

  it('preserves H51.51 authority-convergence contracts', () => {
    const comp=read('src/components/compensation-operational-closure.tsx');
    const payroll=read('src/components/payroll-operational-closure.tsx');
    expect(comp).toContain('Architecture Score Breakdown');
    expect(comp).toContain('Job Families');
    expect(comp).toContain('Position Mappings');
    expect(payroll).toContain('Payroll and Compensation use the same synchronization authority.');
    expect(payroll).toContain('syncLabel');
    expect(read('src/components/payroll-workspace.tsx')).toContain('Run worker selection & exact release overrides');
  });

  it('preserves Country Compliance isolation and AI consequential-action safeguards', () => {
    const payroll=read('src/components/payroll-workspace.tsx')+read('src/components/payroll-operational-closure.tsx');
    expect(payroll).not.toContain('SaudiPayrollGuardPanel');
    expect(payroll).not.toContain('OntarioComplianceReadiness');
    expect(payroll).not.toContain('GOSI regime');
    expect(read('src/lib/compensation/operations-intelligence-service.ts')).toContain('AI may not approve raises');
  });
});