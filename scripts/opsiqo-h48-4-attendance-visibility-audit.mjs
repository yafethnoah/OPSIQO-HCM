import fs from 'node:fs';

const checks=[];
const read=(p)=>fs.readFileSync(p,'utf8');
const present=(p)=>{const ok=fs.existsSync(p);checks.push([ok,`Present: ${p}`]);return ok;};

const precisionPath='src/lib/time/precision.ts';
const frontlinePath='src/lib/time/frontline-service.ts';
const panelPath='src/components/frontline-operations-panel.tsx';
const timePath='src/components/time-workspace.tsx';
const routePath='src/app/api/organizations/[orgId]/time/attendance-activity/route.ts';
const testPath='tests/h48-4-attendance-visibility.test.ts';

for(const p of [precisionPath,frontlinePath,panelPath,timePath,routePath,testPath])present(p);

if(checks.every(([ok])=>ok)){
  const precision=read(precisionPath),frontline=read(frontlinePath),panel=read(panelPath),time=read(timePath),route=read(routePath);
  checks.push([precision.includes('Math.floor(milliseconds / MILLISECONDS_PER_SECOND)'),'Visible timestamp normalization floors to whole-second evidence boundaries']);
  checks.push([precision.includes('timestampAtSecondPrecision(startAt)')&&precision.includes('timestampAtSecondPrecision(endAt)'),'Elapsed attendance uses second-normalized endpoints']);
  checks.push([precision.includes('formatTimestampToSecond'),'Shared whole-second timestamp formatter exists']);
  checks.push([time.includes('formatTimestampToSecond(e.startAt)')&&time.includes("e.endAt?formatTimestampToSecond(e.endAt):'—'"),'Timecard start/end use the same whole-second representation']);
  checks.push([frontline.includes('const minutes=exactMinutesBetween(current.data.startAt,timestamp)'),'Break duration no longer rounds to whole minutes']);
  checks.push([frontline.includes('export async function liveAttendance'),'Live attendance service remains present']);
  checks.push([frontline.includes('employeeNumber:w.employeeNumber'),'Live attendance includes employee identity number']);
  checks.push([frontline.includes('locationName:locationId?locationMap[locationId]||locationId:null'),'Live attendance resolves governed location name only when evidence exists']);
  checks.push([frontline.includes('export async function attendanceActivity'),'Attendance activity service exists']);
  checks.push([frontline.includes("if(!actor.permissions.includes('time.read'))"),'Attendance activity requires time.read']);
  checks.push([frontline.includes('if(!await canReadWorker(actor,e.workerId))continue'),'Attendance activity respects per-worker visibility scope']);
  checks.push([frontline.includes("'time.clock_in'")&&frontline.includes("'time.clock_out'"),'Attendance activity links clock actions to audit evidence']);
  checks.push([frontline.includes('actualMinutes:exactWorkedMinutes'),'Clock-out activity exposes precise actual duration']);
  checks.push([route.includes("requirePermission(actor,'time.read')"),'Attendance activity route enforces time.read']);
  checks.push([route.includes('Math.max(1,Math.min(Math.trunc(requested),200))'),'Attendance activity route bounds result size']);
  checks.push([panel.includes('Who’s In Now'),'Who’s In Now manager/HR visibility is explicit']);
  checks.push([panel.includes('Attendance Activity Log'),'Attendance Activity Log is explicit']);
  checks.push([panel.includes('employeeNumber||p.workerId'),'Who’s In Now shows employee number/ID']);
  checks.push([panel.includes("p.locationName||'Not collected'"),'Who’s In Now makes non-collected location explicit']);
  checks.push([panel.includes('formatDurationMinutes(exactMinutesBetween'),'Open-shift elapsed time updates at second precision']);
  checks.push([panel.includes("a.eventType==='clock_in'?'Clocked in'"),'Activity log labels clock-in events']);
  checks.push([panel.includes("a.eventType==='clock_out'?'Clocked out'"),'Activity log labels clock-out events']);
  checks.push([panel.includes('Audit reference'),'Activity log exposes governed audit reference']);
  checks.push([panel.includes('does not continuously track employees outside attendance events'),'Privacy boundary remains explicit']);
}

let failed=0;
for(const [ok,label] of checks){console.log(`${ok?'PASS':'FAIL'}  ${label}`);if(!ok)failed++;}
console.log(`\nH48.4 attendance visibility/timestamp audit: ${checks.length-failed}/${checks.length} PASS`);
if(failed)process.exit(1);
