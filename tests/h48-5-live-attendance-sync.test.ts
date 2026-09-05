import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ATTENDANCE_CHANGED_EVENT, ATTENDANCE_REFRESH_INTERVAL_MS } from '@/lib/time/attendance-sync';

const timeUi=()=>readFileSync('src/components/time-workspace.tsx','utf8');
const panel=()=>readFileSync('src/components/frontline-operations-panel.tsx','utf8');
const liveRoute=()=>readFileSync('src/app/api/organizations/[orgId]/time/attendance-live/route.ts','utf8');
const activityRoute=()=>readFileSync('src/app/api/organizations/[orgId]/time/attendance-activity/route.ts','utf8');

describe('H48.5 live attendance synchronization',()=>{
  it('uses a shared immediate event and a short safety poll',()=>{
    expect(ATTENDANCE_CHANGED_EVENT).toBe('opsiqo:attendance-changed');
    expect(ATTENDANCE_REFRESH_INTERVAL_MS).toBe(15000);
  });

  it('publishes attendance changes only after successful clock/manual/offline operations',()=>{
    const source=timeUi();
    expect(source).toContain('announceAttendanceChanged(action)');
    expect(source).toContain("announceAttendanceChanged('manual_entry')");
    expect(source).toContain("announceAttendanceChanged('offline_sync')");
    expect(source).toContain('if(saved)announceAttendanceChanged');
  });

  it('refreshes Who’s In Now and activity immediately on attendance changes and browser return',()=>{
    const source=panel();
    expect(source).toContain('const loadLiveAttendance=async()');
    expect(source).toContain('window.addEventListener(ATTENDANCE_CHANGED_EVENT,attendanceChanged)');
    expect(source).toContain("window.addEventListener('focus',refresh)");
    expect(source).toContain("document.addEventListener('visibilitychange',visibilityChanged)");
    expect(source).toContain('window.setInterval(refresh,ATTENDANCE_REFRESH_INTERVAL_MS)');
    expect(source).not.toContain('setInterval(()=>void load(),60000)');
  });

  it('propagates break state changes through the same live synchronization event',()=>{
    const source=panel();
    expect(source).toContain("announceAttendanceChanged(action==='start'?'break_start':'break_end')");
  });

  it('prevents browser/CDN caching on live attendance reads',()=>{
    for(const source of [liveRoute(),activityRoute()]){
      expect(source).toContain("'Cache-Control':'no-store, max-age=0'");
      expect(source).toContain("'CDN-Cache-Control':'no-store'");
      expect(source).toContain("requirePermission(actor,'time.read')");
    }
  });
});
