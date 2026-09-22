import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => fs.readFileSync(path, 'utf8');

describe('H51.75 leave reconciliation + push-readiness UX', () => {
  it('adds a safe exact-code duplicate leave reconciler with balance safeguards', () => {
    const service = read('src/lib/time/service.ts');
    const route = read('src/app/api/organizations/[orgId]/leave/types/reconcile/route.ts');
    expect(service).toContain('reconcileDuplicateLeaveTypes');
    expect(service).toContain('manual_balance_review_required');
    expect(service).toContain('leave_type.reconcile_duplicate');
    expect(service).toContain("row.enabled!==false&&!row.reconciledInto");
    expect(service).toContain('leaveTypeId:item.canonical.id');
    expect(service).toContain('enabled:false');
    expect(route).toContain("requirePermission(actor, 'leave.manage')");
  });

  it('surfaces duplicate leave configurations and hides disabled alias balance cards', () => {
    const workspace = read('src/components/time-workspace.tsx');
    expect(workspace).toContain('duplicateLeaveGroups');
    expect(workspace).toContain('visibleLeaveBalances');
    expect(workspace).toContain("typeMap[b.leaveTypeId]?.enabled!==false");
    expect(workspace).toContain('Duplicate leave configuration detected');
    expect(workspace).toContain('Reconcile safe duplicates');
    expect(workspace).toContain('/leave/types/reconcile');
  });

  it('places Ontario statutory setup next to the operational leave selector', () => {
    const workspace = read('src/components/time-workspace.tsx');
    expect(workspace).toContain('Configure Ontario legal leaves');
    expect(workspace).toContain('missingOntarioStatutoryCount');
    expect(workspace).toContain('configureOntarioStatutoryLeaves');
  });

  it('keeps the quick-create Close button from wrapping vertically', () => {
    const css = read('src/app/globals.css');
    const workspace = read('src/components/time-workspace.tsx');
    expect(workspace).toContain('quickCloseButton');
    expect(css).toContain('.quickLeaveTypeCreator .quickCloseButton');
    expect(css).toContain('white-space:nowrap');
  });

  it('reports reminder scope and approved-leave exclusions separately from push readiness', () => {
    const server = read('src/lib/time/attendance-admin-service.ts');
    const workspace = read('src/components/time-workspace.tsx');
    expect(server).toContain('scopeMatchedWorkers');
    expect(server).toContain('excludedApprovedLeaveWorkers');
    expect(workspace).toContain('matched the selected scope');
    expect(workspace).toContain('excluded on approved leave');
    expect(workspace).toContain('push-ready Pulse device');
  });

  it('preserves H51.74 statutory leave intelligence and H51.73 notification recovery', () => {
    const statutory = read('src/lib/time/leave-compliance.ts');
    const alarm = read('mobile/src/components/attendance-alarm-settings.tsx');
    expect(statutory).toContain('ONTARIO_STATUTORY_LEAVE_TEMPLATES');
    expect(statutory).toContain('mixed_paid_unpaid');
    expect(alarm).toContain('Repair & test server notifications');
  });
});
