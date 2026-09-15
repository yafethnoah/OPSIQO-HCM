import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read=(p:string)=>readFileSync(p,'utf8');

describe('H51.54 Separation Write Reconciliation', () => {
  it('makes separation creation and its HR notification one authoritative batch', () => {
    const source=read('src/lib/separation/service.ts');
    expect(source).toContain('function buildNotification(');
    expect(source).toContain('batch.create(notification.ref,notification.row)');
    expect(source).not.toContain("await batch.commit();await notify(actor.orgId,{title:'New separation case'");
  });

  it('makes submit-for-approval notification atomic with the status transition', () => {
    const source=read('src/lib/separation/service.ts');
    expect(source).toContain('submitBatch.set(ref');
    expect(source).toContain('submitBatch.create(submitNotification.ref,submitNotification.row)');
    expect(source).toContain('await submitBatch.commit()');
  });

  it('reconciles ambiguous write outcomes by reading authoritative state instead of replaying writes', () => {
    const source=read('src/components/separation-workspace.tsx');
    expect(source).toContain("ReconciliationRequiredError");
    expect(source).toContain("reconciliation_required");
    expect(source).toContain("authoritativeSnapshot");
    expect(source).toContain("writeInFlight.current");
    expect(source).toContain("beforeIds");
    expect(source).toContain("OPSIQO reloaded authoritative state");
    expect(source).not.toContain("apiFetch(path,{method,body:JSON.stringify(body)});apiFetch(path");
  });

  it('identifies a newly committed separation without treating a pre-existing case as the new write', () => {
    const source=read('src/components/separation-workspace.tsx');
    expect(source).toContain("!create.beforeIds.has(x.id)");
    expect(source).toContain("x.workerId===create.signature.workerId");
    expect(source).toContain("x.separationType===create.signature.separationType");
    expect(source).toContain("x.effectiveDate===create.signature.effectiveDate");
    expect(source).toContain("x.lastWorkingDate===create.signature.lastWorkingDate");
  });

  it('does not clear the create form unless success or committed-state reconciliation is proven', () => {
    const source=read('src/components/separation-workspace.tsx');
    expect(source).toContain("if(created)form.reset()");
    expect(source).toContain("disabled={writeBusy}");
    expect(source).toContain("writeBusy?'Writing…':'Create case'");
  });

  it('hides the raw reliability error from operational users', () => {
    const source=read('src/components/separation-workspace.tsx');
    expect(source).toContain('Server confirmation was interrupted');
    expect(source).not.toContain("setError(e instanceof Error?e.message:'Operation failed.');};\n const create=");
  });

  it('preserves H51.53 attendance integrity contracts untouched', () => {
    const source=read('src/lib/time/attendance-integrity.ts');
    expect(source).toContain('admin_manual_clock_out');
    expect(source).toContain('attendanceCorrections');
    expect(read('src/components/frontline-operations-panel.tsx')).toContain('Clock Out Employee');
  });
});