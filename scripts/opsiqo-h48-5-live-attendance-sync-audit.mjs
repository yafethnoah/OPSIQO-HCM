import fs from 'node:fs';

const checks=[];
const read=(p)=>fs.readFileSync(p,'utf8');
const present=(p)=>{const ok=fs.existsSync(p);checks.push([ok,`Present: ${p}`]);return ok;};

const syncPath='src/lib/time/attendance-sync.ts';
const timePath='src/components/time-workspace.tsx';
const panelPath='src/components/frontline-operations-panel.tsx';
const liveRoutePath='src/app/api/organizations/[orgId]/time/attendance-live/route.ts';
const activityRoutePath='src/app/api/organizations/[orgId]/time/attendance-activity/route.ts';
const testPath='tests/h48-5-live-attendance-sync.test.ts';

for(const p of [syncPath,timePath,panelPath,liveRoutePath,activityRoutePath,testPath])present(p);

if(checks.every(([ok])=>ok)){
  const sync=read(syncPath),time=read(timePath),panel=read(panelPath),liveRoute=read(liveRoutePath),activityRoute=read(activityRoutePath);
  checks.push([sync.includes("ATTENDANCE_CHANGED_EVENT='opsiqo:attendance-changed'"),'Shared attendance-change event is defined']);
  checks.push([sync.includes('ATTENDANCE_REFRESH_INTERVAL_MS=15000'),'Safety polling interval is 15 seconds']);
  checks.push([sync.includes('window.dispatchEvent(new CustomEvent'),'Attendance-change helper dispatches a browser event']);
  checks.push([time.includes("announceAttendanceChanged(action)"),'Clock-in/clock-out success publishes attendance change']);
  checks.push([time.includes("announceAttendanceChanged('offline_sync')"),'Offline reconciliation publishes attendance change']);
  checks.push([time.includes("announceAttendanceChanged('manual_entry')"),'Manual attendance entry publishes attendance change']);
  checks.push([time.includes('const saved=await submit')&&time.includes('return true;')&&time.includes('return false;'),'Manual change notification is success-gated']);
  checks.push([panel.includes('loadLiveAttendance'),'Frontline panel has a focused live-attendance refresh path']);
  checks.push([panel.includes('ATTENDANCE_CHANGED_EVENT'),'Frontline panel listens for attendance-change events']);
  checks.push([panel.includes("window.addEventListener(ATTENDANCE_CHANGED_EVENT,attendanceChanged)"),'Attendance change triggers immediate live refresh']);
  checks.push([panel.includes("window.addEventListener('focus',refresh)"),'Window focus refreshes live attendance']);
  checks.push([panel.includes("document.addEventListener('visibilitychange',visibilityChanged)"),'Tab visibility restoration refreshes live attendance']);
  checks.push([panel.includes('ATTENDANCE_REFRESH_INTERVAL_MS'),'Frontline safety poll uses the shared interval']);
  checks.push([!panel.includes('setInterval(()=>void load(),60000'),'Legacy 60-second full-workspace attendance poll removed']);
  checks.push([panel.includes("announceAttendanceChanged(action==='start'?'break_start':'break_end')"),'Break start/end publishes attendance change']);
  checks.push([panel.includes('Event-driven refresh is immediate, with a 15-second safety poll.'),'UI explains immediate event refresh plus fallback polling']);
  checks.push([liveRoute.includes("'Cache-Control':'no-store, max-age=0'"),'Who’s In Now endpoint is no-store']);
  checks.push([liveRoute.includes("'CDN-Cache-Control':'no-store'"),'Who’s In Now CDN caching is disabled']);
  checks.push([activityRoute.includes("'Cache-Control':'no-store, max-age=0'"),'Attendance activity endpoint is no-store']);
  checks.push([activityRoute.includes("'CDN-Cache-Control':'no-store'"),'Attendance activity CDN caching is disabled']);
  checks.push([liveRoute.includes("requirePermission(actor,'time.read')"),'Live attendance permission gate preserved']);
  checks.push([activityRoute.includes("requirePermission(actor,'time.read')"),'Activity permission gate preserved']);
  checks.push([panel.includes('Promise.all([apiFetch<{data:Attendance}>')&&panel.includes('attendance-activity?limit=100'),'Roster and activity refresh in the same live cycle']);
  checks.push([panel.includes('setNowMs(Date.now())'),'Live elapsed timer re-anchors after refreshed attendance']);
  checks.push([panel.includes("window.removeEventListener(ATTENDANCE_CHANGED_EVENT,attendanceChanged)"),'Attendance event listener is cleaned up']);
  checks.push([panel.includes("document.removeEventListener('visibilitychange',visibilityChanged)"),'Visibility listener is cleaned up']);
}

let failed=0;
for(const [ok,label] of checks){console.log(`${ok?'PASS':'FAIL'}  ${label}`);if(!ok)failed++;}
console.log(`\nH48.5 live attendance synchronization audit: ${checks.length-failed}/${checks.length} PASS`);
if(failed)process.exit(1);
