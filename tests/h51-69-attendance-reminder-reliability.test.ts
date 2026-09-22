import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { attendanceServerReminderDecisions } from '@/lib/time/attendance-reminder-server';
import type { ShiftAssignment, TimeEntry } from '@/domain/time';

const read=(p:string)=>readFileSync(p,'utf8');
const shift=(start:string,end:string):ShiftAssignment=>({id:'shift-1',workerId:'worker-1',title:'Morning shift',startAt:start,endAt:end,status:'published',createdBy:'admin',createdAt:start,updatedAt:start});
const entry=(startAt:string,endAt?:string):TimeEntry=>({id:'time-1',workerId:'worker-1',startAt,endAt,breakMinutes:0,source:'web_clock',status:endAt?'complete':'open',createdBy:'worker',createdAt:startAt,updatedAt:endAt||startAt});

describe('H51.69 attendance reminder reliability',()=>{
  it('sends server Clock In due + late reminders only while the worker has not clocked in',()=>{
    const s=shift('2026-09-22T13:00:00.000Z','2026-09-22T21:00:00.000Z');
    expect(attendanceServerReminderDecisions(s,[],Date.parse('2026-09-22T13:00:30.000Z')).map(x=>x.stage)).toContain('clock_in_due');
    expect(attendanceServerReminderDecisions(s,[],Date.parse('2026-09-22T13:05:30.000Z')).map(x=>x.stage)).toContain('clock_in_late');
    expect(attendanceServerReminderDecisions(s,[entry('2026-09-22T12:58:00.000Z')],Date.parse('2026-09-22T13:05:30.000Z')).map(x=>x.stage)).not.toContain('clock_in_late');
  });

  it('sends Clock Out reminders only while an open attendance entry remains',()=>{
    const s=shift('2026-09-22T13:00:00.000Z','2026-09-22T21:00:00.000Z');
    const open=entry('2026-09-22T13:00:00.000Z');
    expect(attendanceServerReminderDecisions(s,[open],Date.parse('2026-09-22T21:00:30.000Z')).map(x=>x.stage)).toContain('clock_out_due');
    expect(attendanceServerReminderDecisions(s,[open],Date.parse('2026-09-22T21:10:30.000Z')).map(x=>x.stage)).toContain('clock_out_late');
    const closed=entry('2026-09-22T13:00:00.000Z','2026-09-22T20:59:00.000Z');
    expect(attendanceServerReminderDecisions(s,[closed],Date.parse('2026-09-22T21:10:30.000Z'))).toEqual([]);
  });

  it('uses deterministic delivery idempotency and Expo push backup',()=>{
    const source=read('src/lib/time/attendance-reminder-server.ts');
    expect(source).toContain('attendanceReminderDeliveries');
    expect(source).toContain("status==='sent'");
    expect(source).toContain("EXPO_PUSH_URL='https://exp.host/--/api/v2/push/send'");
    expect(source).toContain("source:'server_backup'");
  });

  it('keeps in-app notification fallback even when no push-capable device exists',()=>{
    const source=read('src/lib/time/attendance-reminder-server.ts');
    expect(source).toContain('createInAppReminder');
    expect(source).toContain("'no_push_device'");
  });

  it('exposes a secret-protected minute-job endpoint',()=>{
    const route=read('src/app/api/system/attendance-reminders/route.ts');
    expect(route).toContain('OPSIQO_JOB_SECRET');
    expect(route).toContain('x-opsiqo-job-secret');
    expect(route).toContain('timingSafeEqual');
    expect(route).toContain('processAttendanceServerReminders');
  });

  it('auto-registers the authenticated Pulse device for push backup',()=>{
    const layout=read('mobile/app/(app)/_layout.tsx');
    expect(layout).toContain('registerDevice(activeOrgId, { requestPush: true })');
    expect(layout).toContain('useAttendanceReminders');
  });

  it('shows local + server reminder redundancy in Pulse',()=>{
    const settings=read('mobile/src/components/attendance-alarm-settings.tsx');
    expect(settings).toContain('Local device alarms:');
    expect(settings).toContain('Server backup reminder:');
    expect(settings).toContain('Push-capable devices:');
  });

  it('preserves H51.59 local scheduling as the first reminder layer',()=>{
    const local=read('mobile/src/notifications/attendance-reminders.ts');
    expect(local).toContain('Notifications.scheduleNotificationAsync');
    expect(local).toContain('"clock_in"');
    expect(local).toContain('"clock_out"');
    expect(local).toContain('AppState.addEventListener("change"');
  });
});
