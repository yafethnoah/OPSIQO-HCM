import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  attendanceLocalDate,
  attendanceZonedDayStart,
  normalizeAttendanceActivityRange,
} from '../src/lib/time/attendance-activity';

const read=(path:string)=>readFileSync(path,'utf8');

describe('H50.6B attendance activity retention and on-demand history',()=>{
  it('defaults the activity range to today in the requested timezone',()=>{
    const range=normalizeAttendanceActivityRange(
      {timeZone:'America/Toronto'},
      '2026-09-08T17:15:00.000Z',
    );
    expect(range.from).toBe('2026-09-08');
    expect(range.to).toBe('2026-09-08');
    expect(range.mode).toBe('today');
    expect(attendanceLocalDate('2026-09-09T02:00:00.000Z','America/Toronto')).toBe('2026-09-08');
  });

  it('uses timezone-correct DST boundaries instead of naive UTC days',()=>{
    expect(attendanceZonedDayStart('2026-03-08','America/Toronto')).toBe('2026-03-08T05:00:00.000Z');
    expect(attendanceZonedDayStart('2026-03-09','America/Toronto')).toBe('2026-03-09T04:00:00.000Z');
    const spring=normalizeAttendanceActivityRange(
      {from:'2026-03-08',to:'2026-03-08',timeZone:'America/Toronto'},
      '2026-03-08T12:00:00.000Z',
    );
    expect(Date.parse(spring.endExclusiveIso)-Date.parse(spring.startIso)).toBe(23*60*60*1000);
  });

  it('bounds history to a governed maximum and rejects reversed ranges',()=>{
    expect(()=>normalizeAttendanceActivityRange({from:'2026-09-09',to:'2026-09-08',timeZone:'UTC'})).toThrow('invalid_date_order');
    expect(()=>normalizeAttendanceActivityRange({from:'2025-01-01',to:'2026-09-08',timeZone:'UTC'})).toThrow('range_too_large');
  });

  it('fetches attendance history server-side by start/end event timestamps without deleting records',()=>{
    const service=read('src/lib/time/frontline-service.ts');
    expect(service).toContain(".where('startAt','>=',range.startIso)");
    expect(service).toContain(".where('endAt','>=',range.startIso)");
    expect(service).toContain("eventAt>=range.startIso&&eventAt<range.endExclusiveIso");
    expect(service).toContain("where('entityId','in',chunk)");
    expect(service).toContain('exportAttendanceActivityCsv');
    const activityBlock=service.slice(
      service.indexOf('export async function attendanceActivity'),
      service.indexOf('function validAttendanceImage'),
    );
    expect(activityBlock).not.toMatch(/\.delete\(/);
  });

  it('keeps organization/worker permission enforcement on history and exports',()=>{
    const service=read('src/lib/time/frontline-service.ts');
    expect(service).toContain("if(!actor.permissions.includes('time.read'))");
    expect(service).toContain('if(!await canReadWorker(actor,e.workerId))continue');
    expect(service).toContain('attendance_activity.export');
    const route=read('src/app/api/organizations/[orgId]/time/attendance-activity/route.ts');
    expect(route).toContain("requirePermission(actor,'time.read')");
    expect(route).toContain('exportAttendanceActivityCsv(actor,input)');
  });

  it('shows only today by default and loads older history only on explicit user action',()=>{
    const ui=read('src/components/frontline-operations-panel.tsx');
    expect(ui).toContain("mode:'today'");
    expect(ui).toContain("activityRangeRef.current.mode==='today'");
    expect(ui).toContain('Load history');
    expect(ui).toContain('Show today');
    expect(ui).toContain('Extract selected range');
    expect(ui).toContain('Historical attendance remains stored in OPSIQO');
    expect(ui).toContain('format=csv');
  });

  it('publishes H50.6B runtime identity',()=>{
    const identity=read('src/lib/release/identity.ts');
    expect(identity).toContain("OPSIQO_PATCH_RELEASE = process.env.OPSIQO_PATCH_RELEASE || 'H50.6B'");
  });
});
