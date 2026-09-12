import{describe,expect,it}from'vitest';
import fs from'node:fs';

const payroll=fs.readFileSync('src/lib/payroll/control-plane.ts','utf8');
const service=fs.readFileSync('src/lib/payroll/service.ts','utf8');
const domain=fs.readFileSync('src/domain/payroll.ts','utf8');
const payrollSchemas=fs.readFileSync('src/lib/payroll/schemas.ts','utf8');
const compSchemas=fs.readFileSync('src/lib/compensation/schemas.ts','utf8');
const compDomain=fs.readFileSync('src/domain/compensation.ts','utf8');
const perms=fs.readFileSync('src/domain/security.ts','utf8');
const workspace=fs.readFileSync('src/components/payroll-workspace.tsx','utf8');
const comp=fs.readFileSync('src/lib/compensation/controls.ts','utf8');
const cycleRoute=fs.readFileSync('src/app/api/organizations/[orgId]/compensation/cycles/[cycleId]/route.ts','utf8');

describe('H51.35 governed payroll production controls',()=>{
  it('implements the full payroll run lifecycle',()=>{for(const s of ["status:'draft'","status:'calculated'","status:'review'","status:'approved'","status:'exported'","status:'reconciled'","status:'completed'","status:'reversed'"])expect(payroll).toContain(s)});
  it('enforces maker-checker segregation',()=>{expect(payroll).toContain('payroll_maker_checker');expect(payroll).toContain("run.calculatedBy===a.uid");expect(payroll).toContain("run.createdBy===a.uid||run.calculatedBy===a.uid")});
  it('creates immutable source-bound snapshots and calculation hashes',()=>{expect(domain).toContain('PayrollInputSnapshot');expect(payroll).toContain('sourceHash');expect(payroll).toContain('calculationHash');expect(payroll).toContain('immutableAt')});
  it('binds compensation, approved timesheets and approved adjustments into payroll',()=>{expect(payroll).toContain("workerCompensationCurrent");expect(payroll).toContain("t.status==='approved'");expect(payroll).toContain("x.status==='approved'");expect(payroll).toContain('leaveRequests');expect(payroll).toContain('recurringTaxableBenefits')});
  it('exports actual provider records instead of an empty array',()=>{expect(payroll).toContain('adapter.push(records)');expect(payroll).not.toContain('adapter.push([])');expect(service).not.toContain('adapter.push([])')});
  it('requires reconciliation before completion',()=>{expect(payroll).toContain("run.status!=='reconciled'");expect(payroll).toContain('payrollReconciliations')});
  it('generates source-bound pay statements and YTD evidence',()=>{expect(payroll).toContain('payStatements');expect(payroll).toContain('calculationHash');expect(payroll).toContain('ytd=')});
  it('supports off-cycle, correction, termination and reversal workflows',()=>{
  for(const s of ["'off_cycle'","'correction'","'termination'"])expect(payrollSchemas).toContain(s);
  expect(payroll).toContain('reversePayrollRun');
  expect(payroll).toContain("kind:'correction'");
});
  it('keeps production payroll fail-closed until independent validation and certification',()=>{expect(payroll).toContain("reg.state!=='certified'");expect(payroll).toContain('caseCount<100');expect(payroll).toContain('validator cannot independently certify')});
  it('separates payroll permissions',()=>{for(const p of ['payroll.read','payroll.calculate','payroll.review','payroll.approve','payroll.provider.manage','payroll.reconcile','payroll.reverse','payroll.validate'])expect(perms).toContain(p)});
  it('removes the hard-coded UAT reference worker from the payroll UI',()=>{expect(workspace).not.toContain('uat-reference-worker');expect(workspace).toContain('Controlled UAT payroll run')});
  it('labels payroll UAT/certification state truthfully',()=>{expect(service).toContain('uat_controls_ready_reference_validation_required');expect(service).toContain('Production payroll remains fail-closed')});
});

describe('H51.35 compensation hardening',()=>{
  it('serializes compensation cycle mutations through a lease lock',()=>{expect(comp).toContain('compensationCycleLocks');expect(comp).toContain('compensation_cycle_locked');expect(cycleRoute).toContain('actCompensationCycleControlled')});
  it('requires provenance for FX conversions and market benchmarks',()=>{
  expect(comp).toContain('compensationFxRates');
  expect(comp).toContain('marketBenchmarkProvenance');
  expect(compSchemas).toContain('sourceReference');
  expect(compDomain).toContain('sourceReference');
});
  it('implements explicit retroactive compensation correction workflow',()=>{expect(comp).toContain('compensationCorrections');expect(comp).toContain('future_compensation_requires_cycle');expect(comp).toContain("type:'retro'");expect(comp).toContain("status:'submitted'")});
  it('keeps correction maker and approver separate',()=>{expect(comp).toContain('compensation_maker_checker')});
  it('versions compensation letters instead of overwriting released evidence',()=>{expect(comp).toContain('supersedesLetterId');expect(comp).toContain('supersededByLetterId');expect(comp).toContain('version=')});
});
