import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compensationPayrollSyncLabel, evaluateCompensationPayrollSync } from '@/lib/compensation/payroll-sync-authority';
import { calculateCompensationArchitectureHealth, evaluateWorkerBandMapping } from '@/lib/compensation/authority-convergence';
import { resolveAuthoritativeWorkerPayDate } from '@/lib/payroll/operations-intelligence';

describe('H51.51 Payroll + Compensation Authority Convergence', () => {
  it('publishes canonical synchronization labels', () => {
    expect(compensationPayrollSyncLabel('not_applicable')).toBe('Not Applicable');
    expect(compensationPayrollSyncLabel('missing_sync_evidence')).toBe('Missing Sync Evidence');
    expect(compensationPayrollSyncLabel('stale_compensation_record')).toBe('Stale Compensation Record');
    expect(compensationPayrollSyncLabel('payroll_review_required')).toBe('Payroll Review Required');
    expect(compensationPayrollSyncLabel('reviewed')).toBe('Reviewed');
    expect(evaluateCompensationPayrollSync({ id: 'c1' } as any, undefined)).toMatchObject({
      state: 'missing_sync_evidence',
      label: 'Missing Sync Evidence',
      requiresAttention: true,
    });
  });

  it('uses one authoritative band-mapping population', () => {
    expect(evaluateWorkerBandMapping({ hasCompensation: true })).toMatchObject({
      state: 'missing_position',
      requiresAttention: true,
    });
    expect(evaluateWorkerBandMapping({ hasCompensation: true, positionId: 'p1' })).toMatchObject({
      state: 'missing_band_mapping',
      requiresAttention: true,
    });
    expect(evaluateWorkerBandMapping({
      hasCompensation: true,
      positionId: 'p1',
      salaryBandId: 'b1',
      salaryBandStatus: 'active',
    })).toMatchObject({
      state: 'mapped',
      requiresAttention: false,
    });
  });

  it('reports zero architecture health without an active architecture foundation', () => {
    const health = calculateCompensationArchitectureHealth({
      activeJobFamilies: 0,
      activeJobLevels: 0,
      activeSalaryBands: 0,
      currentPositions: 3,
      mappedCurrentPositions: 0,
      workersInScope: 5,
      placedWorkers: 0,
    });
    expect(health.overallPct).toBe(0);
    expect(health.foundationConfigured).toBe(false);
    expect(health.dimensions.map((x) => x.label)).toEqual([
      'Job Families','Job Levels','Salary Bands','Position Mappings','Employee Placements',
    ]);
  });

  it('feeds band mapping and architecture from the same authority', () => {
    expect(readFileSync('src/lib/compensation/readiness.ts', 'utf8')).toContain('evaluateWorkerBandMapping');
    expect(readFileSync('src/lib/compensation/service.ts', 'utf8')).toContain('evaluateWorkerBandMapping');
    const intel = readFileSync('src/lib/compensation/operations-intelligence-service.ts', 'utf8');
    expect(intel).toContain('readiness.counts.missingBand');
    expect(intel).toContain('readiness.architecture');
  });

  it('removes ambiguous Mismatch semantics from Payroll UI', () => {
    const command = readFileSync('src/components/payroll-operations-command-center.tsx', 'utf8');
    const operational = readFileSync('src/components/payroll-operational-closure.tsx', 'utf8');
    expect(command).not.toContain('>Mismatch<');
    expect(command).toContain('Canonical synchronization states');
    expect(operational).toContain('syncLabel');
  });

  it('uses exact override before governed calendar hierarchy in actual payroll authority', () => {
    const profile = { payDateRule: 'offset_days', payDateOffsetDays: 2, weekendAdjustment: 'none' } as any;
    const worker = { id: 'w1', payGroupId: 'g1', orgUnitId: 'o1' };
    const rules = [
      { id:'org', scope:'organization', rule:'offset_days', offsetDays:5, weekendAdjustment:'none', effectiveDate:'2026-01-01', status:'active' },
      { id:'worker', scope:'worker', targetId:'w1', rule:'fixed_day_of_month', dayOfMonth:20, weekendAdjustment:'none', effectiveDate:'2026-01-01', status:'active' },
    ] as any;

    expect(resolveAuthoritativeWorkerPayDate(
      { payDate:'2026-09-15', workerPayDates:{ w1:'2026-09-18' } },
      profile,
      worker,
      rules,
    )).toMatchObject({ payDate:'2026-09-18', source:'worker_override' });

    expect(resolveAuthoritativeWorkerPayDate(
      { payDate:'2026-09-15' },
      profile,
      worker,
      rules,
    )).toMatchObject({ payDate:'2026-09-20', source:'worker_calendar' });
  });

  it('converges legacy release UX into Calendars plus run-only overrides', () => {
    const workspace = readFileSync('src/components/payroll-workspace.tsx', 'utf8');
    expect(workspace).not.toContain('Member-specific salary release dates');
    expect(workspace).toContain('Run worker selection & exact release overrides');
    expect(workspace).toContain('Manage persistent rules in Calendars');
    expect(workspace).toContain('payroll-controlled-regular-run');
  });

  it('shows an explicit architecture score breakdown', () => {
    const ui = readFileSync('src/components/compensation-operational-closure.tsx', 'utf8');
    expect(ui).toContain('Architecture Score Breakdown');
    for (const label of ['Job Families','Job Levels','Salary Bands','Position Mappings','Employee Placements']) {
      expect(ui).toContain(label);
    }
    expect(ui).toContain('Architecture: {readiness.health.architecturePct}%');
  });

  it('adds sticky columns and no-wrap status controls', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    expect(css).toContain('.authorityStickyTable');
    expect(css).toContain('position:sticky');
    expect(css).toContain('white-space: nowrap');
  });

  it('preserves AI and Country Compliance isolation safeguards', () => {
    const payroll = readFileSync('src/components/payroll-workspace.tsx', 'utf8') +
      readFileSync('src/components/payroll-operational-closure.tsx', 'utf8');
    expect(payroll).not.toContain('SaudiPayrollGuardPanel');
    expect(payroll).not.toContain('OntarioComplianceReadiness');
    expect(payroll).not.toContain('GOSI regime');
    expect(readFileSync('src/lib/compensation/operations-intelligence-service.ts','utf8')).toContain('AI may not approve raises');
  });
});