import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

const read=(p:string)=>readFileSync(p,'utf8');

describe('H51.70 attendance alarms, admin broadcast and leave-on-behalf',()=>{
  it('preserves exact armed local reminders and a short due-time grace',()=>{
    const source=read('mobile/src/notifications/attendance-reminders.ts');
    const start=source.indexOf('export async function synchronizeAttendanceReminders');
    const end=source.indexOf('export function useAttendanceReminders',start);
    const sync=source.slice(start,end);
    expect(source).toContain('DUE_REMINDER_GRACE_MS');
    expect(sync).toContain('existingByKey');
    expect(sync).toContain('desiredKeys');
    expect(sync).toContain('if (!existingByKey.has(key))');
    expect(sync).toContain('recentlyDue');
    expect(sync).toContain('stillRelevant');
    expect(sync).toContain('nextClockInAt');
    expect(sync).toContain('nextClockOutAt');
  });

  it('shows explicit Clock In and Clock Out armed state plus manual re-arm',()=>{
    const ui=read('mobile/src/components/attendance-alarm-settings.tsx');
    expect(ui).toContain('Clock In alarm:');
    expect(ui).toContain('Clock Out alarm:');
    expect(ui).toContain('Re-arm Clock In / Clock Out alarms');
    expect(ui).toContain('Last alarm sync:');
  });

  it('adds an audited admin attendance broadcast with all-staff and state-aware scopes',()=>{
    const service=read('src/lib/time/attendance-admin-service.ts');
    const route=read('src/app/api/organizations/[orgId]/time/attendance-reminders/broadcast/route.ts');
    expect(service).toContain("z.enum(['all_active','not_clocked_in','clocked_in'])");
    expect(service).toContain("action:'attendance.reminder.broadcast'");
    expect(service).toContain("source:'admin_broadcast'");
    expect(service).toContain('excludeApprovedLeave');
    expect(route).toContain("requirePermission(actor,'time.manage')");
  });

  it('broadcast does not create manual attendance records',()=>{
    const service=read('src/lib/time/attendance-admin-service.ts');
    expect(service).toContain('attendanceBroadcasts');
    expect(service).not.toContain("source:'manual'");
    expect(service).not.toContain("status:'complete'");
  });

  it('allows HR to record partial-day or full-day leave on behalf with provenance',()=>{
    const service=read('src/lib/time/service.ts');
    const schema=read('src/lib/time/schemas.ts');
    const domain=read('src/domain/time.ts');
    expect(schema).toContain('adminLeaveRecordSchema');
    expect(schema).toContain('approveImmediately');
    expect(service).toContain('recordLeaveForWorker');
    expect(service).toContain("action:'leave.record_on_behalf'");
    expect(domain).toContain("submissionSource?: 'self_service' | 'admin_on_behalf'");
    expect(domain).toContain('adminReason?: string');
  });

  it('keeps immediate admin approval permissioned and blocks the admin self path',()=>{
    const service=read('src/lib/time/service.ts');
    expect(service).toContain("!actor.permissions.includes('leave.approve')");
    expect(service).toContain("actor.workerId===input.workerId");
    expect(service).toContain("'admin_on_behalf_self_blocked'");
  });

  it('adds administration UX for leave-on-behalf and attendance broadcast',()=>{
    const ui=read('src/components/time-workspace.tsx');
    expect(ui).toContain('Record leave for this employee');
    expect(ui).toContain('Hours (optional partial day)');
    expect(ui).toContain('Record and approve immediately');
    expect(ui).toContain('Send Clock In / Clock Out reminder');
    expect(ui).toContain('All active staff');
    expect(ui).toContain('Send attendance alarm');
  });

  it('preserves H51.69 hybrid server reminder reliability',()=>{
    const service=read('src/lib/time/attendance-reminder-server.ts');
    expect(service).toContain('clock_in_late');
    expect(service).toContain('clock_out_late');
    expect(service).toContain('attendanceReminderDeliveries');
  });
});
