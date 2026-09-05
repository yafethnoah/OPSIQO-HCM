import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  exactMinutesBetween,
  exactWorkedMinutes,
  formatDurationMinutes,
  normalizeTimestampToSecond,
  timestampAtSecondPrecision,
} from '@/lib/time/precision';

const frontline=()=>readFileSync('src/lib/time/frontline-service.ts','utf8');
const panel=()=>readFileSync('src/components/frontline-operations-panel.tsx','utf8');
const timeUi=()=>readFileSync('src/components/time-workspace.tsx','utf8');
const route=()=>readFileSync('src/app/api/organizations/[orgId]/time/attendance-activity/route.ts','utf8');

describe('H48.4 attendance visibility and timestamp consistency',()=>{
  it('normalizes both visible endpoints to whole seconds before duration math',()=>{
    const start='2026-09-04T23:45:19.900Z';
    const end='2026-09-04T23:58:40.100Z';
    expect(normalizeTimestampToSecond(start)).toBe('2026-09-04T23:45:19.000Z');
    expect(normalizeTimestampToSecond(end)).toBe('2026-09-04T23:58:40.000Z');
    expect(timestampAtSecondPrecision(end)-timestampAtSecondPrecision(start)).toBe(801000);
    const minutes=exactWorkedMinutes(start,end,0);
    expect(minutes).toBeCloseTo(13+21/60,6);
    expect(formatDurationMinutes(minutes)).toBe('13m 21s');
  });

  it('keeps sub-minute attendance evidence visible and consistent',()=>{
    const minutes=exactMinutesBetween('2026-09-04T23:42:42.950Z','2026-09-04T23:43:11.050Z');
    expect(minutes).toBeCloseTo(29/60,6);
    expect(formatDurationMinutes(minutes)).toBe('29s');
  });

  it('removes whole-minute break rounding so breaks keep second precision',()=>{
    const source=frontline();
    expect(source).toContain('const minutes=exactMinutesBetween(current.data.startAt,timestamp)');
    expect(source).not.toContain("Math.round((new Date(timestamp).getTime()-new Date(current.data.startAt).getTime())/60000)");
  });

  it('provides permission-scoped Who’s In Now and recent attendance activity',()=>{
    const source=frontline();
    expect(source).toContain('export async function liveAttendance');
    expect(source).toContain('employeeNumber:w.employeeNumber');
    expect(source).toContain('export async function attendanceActivity');
    expect(source).toContain('if(!await canReadWorker(actor,e.workerId))continue');
    expect(source).toContain("eventType:e.source==='manual'?'manual_entry':'clock_in'");
    expect(source).toContain("eventType:e.source==='manual'?'manual_entry_complete':'clock_out'");
    expect(source).toContain('auditRef:auditByEvent.get');
  });

  it('renders explicit attendance identity, activity log and second-consistent timestamps',()=>{
    const ui=panel();
    expect(ui).toContain('Who’s In Now');
    expect(ui).toContain('Attendance Activity Log');
    expect(ui).toContain('employeeNumber||p.workerId');
    expect(ui).toContain('Clocked in');
    expect(ui).toContain('Clocked out');
    expect(ui).toContain('Audit reference');
    expect(ui).toContain('formatTimestampToSecond');
    expect(timeUi()).toContain('formatTimestampToSecond(e.startAt)');
    expect(route()).toContain("requirePermission(actor,'time.read')");
    expect(route()).toContain('attendanceActivity(actor,limit)');
  });
});
