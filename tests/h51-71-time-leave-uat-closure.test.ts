import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
const read=(p:string)=>readFileSync(p,'utf8');

describe('H51.71 Time & Leave UAT closure',()=>{
  it('never renders an unexplained blank leave-type selector',()=>{
    const ui=read('src/components/time-workspace.tsx');
    expect(ui).toContain("const enabledLeaveTypes=useMemo");
    expect(ui).toContain('No enabled leave types configured');
    expect(ui).toContain('Leave setup required.');
    expect(ui).toContain("document.getElementById('leave-type-configuration')");
    expect(ui).toContain('disabled={!enabledLeaveTypes.length}');
  });

  it('keeps leave configuration one click away without inventing legal entitlements',()=>{
    const ui=read('src/components/time-workspace.tsx');
    expect(ui).toContain('id="leave-type-configuration"');
    expect(ui).toContain('Create leave type');
    expect(ui).not.toContain('Create Ontario sick leave automatically');
  });

  it('shows admin leave validation and result beside the form',()=>{
    const ui=read('src/components/time-workspace.tsx');
    expect(ui).toContain('adminLeaveFeedback');
    expect(ui).toContain('Provide an administrative reason of at least 10 characters.');
    expect(ui).toContain("minLength={10}");
  });

  it('shows attendance broadcast validation and result beside the action',()=>{
    const ui=read('src/components/time-workspace.tsx');
    expect(ui).toContain('broadcastFeedback');
    expect(ui).toContain('Provide an operational reason of at least 10 characters');
    expect(ui).toContain('Reminder processed for');
    expect(ui).toContain('Push accepted for');
  });

  it('preserves H51.70 administrative actions and safeguards',()=>{
    const ui=read('src/components/time-workspace.tsx');
    const admin=read('src/lib/time/attendance-admin-service.ts');
    const service=read('src/lib/time/service.ts');
    expect(ui).toContain('Send attendance alarm');
    expect(ui).toContain('Record leave for employee');
    expect(admin).toContain("action:'attendance.reminder.broadcast'");
    expect(service).toContain('recordLeaveForWorker');
    expect(service).toContain("'admin_on_behalf_self_blocked'");
  });

  it('keeps substantive server-side reason enforcement',()=>{
    const leaveSchema=read('src/lib/time/schemas.ts');
    const broadcast=read('src/lib/time/attendance-admin-service.ts');
    expect(leaveSchema).toContain("min(10,'Provide an administrative reason of at least 10 characters.')");
    expect(broadcast).toContain("min(10,'Provide an operational reason of at least 10 characters.')");
  });
});
