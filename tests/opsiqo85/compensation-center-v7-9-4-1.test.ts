import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workspace = readFileSync('src/components/compensation-workspace.tsx','utf8');
const page = readFileSync('src/app/compensation/page.tsx','utf8');
const service = readFileSync('src/lib/compensation/service.ts','utf8');

describe('V7.9.4.1 Compensation Center closure',()=>{
  it('presents Compensation Center as a governed control surface',()=>{
    expect(page).toContain('Compensation Center');
    expect(workspace).toContain('Compensation Center · governed decision support');
    expect(workspace).toContain('Compensation health queue');
    expect(workspace).toContain('Range health');
  });

  it('adds searchable compensation positioning and scoped CSV export',()=>{
    expect(workspace).toContain('Search employee, position, band');
    expect(workspace).toContain('Export visible CSV');
    expect(workspace).toContain('opsiqo-compensation-snapshot-');
    expect(workspace).toContain('Outside salary band');
  });

  it('exposes traceable market benchmark management',()=>{
    expect(workspace).toContain('Add reviewed market benchmark');
    expect(workspace).toContain('/compensation/benchmarks');
    expect(workspace).toContain('Market benchmark library');
    expect(workspace).toContain('marketBenchmarkId');
  });

  it('surfaces full compensation-cycle decision controls and budget utilization',()=>{
    expect(workspace).toContain('Cycle control board');
    expect(workspace).toContain('utilization');
    expect(workspace).toContain("action:'approve'");
    expect(workspace).toContain("action:'reject'");
    expect(workspace).toContain("action:'apply'");
    expect(workspace).toContain("action:'close'");
    expect(workspace).toContain("action:'cancel'");
  });

  it('surfaces governed compensation letters and explicit release',()=>{
    expect(workspace).toContain('Compensation letters');
    expect(workspace).toContain("body:JSON.stringify({action:'release'})");
    expect(workspace).toContain('Release remains an explicit HR approval action');
  });

  it('reloads compensation data when the organization context changes',()=>{
    expect(workspace).toContain("opsiqo:organization-changed");
    expect(workspace).toContain('activeOrgId()');
  });

  it('validates job-architecture and market references before saving mappings',()=>{
    expect(service).toContain("'market_benchmark_not_found'");
    expect(service).toContain("'job_family_not_found'");
    expect(service).toContain("'job_level_not_found'");
    expect(service).toContain("reserveCode(actor,'marketBenchmark'");
  });

  it('preserves worker pay basis and currency for controlled off-cycle adjustments',()=>{
    expect(workspace).toContain('selectedPayBasis');
    expect(workspace).toContain('selectedCurrency');
    expect(workspace).toContain("selectedPayBasis==='hourly'");
    expect(workspace).toContain('annualizedBasePay:salary');
  });

  it('retains human-review boundaries for pay equity and compensation decisions',()=>{
    expect(workspace).toContain('not legal conclusions');
    expect(workspace).toContain('does not automatically determine pay');
    expect(workspace).toContain('qualified Pay Equity Act review');
  });
});
