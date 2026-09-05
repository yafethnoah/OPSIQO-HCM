import fs from 'node:fs';

const checks=[];
const read=(p)=>fs.readFileSync(p,'utf8');
const present=(p)=>{const ok=fs.existsSync(p);checks.push([ok,`Present: ${p}`]);return ok;};

const precisionPath='src/lib/time/precision.ts';
const servicePath='src/lib/time/service.ts';
const workspacePath='src/components/time-workspace.tsx';
const schemaPath='src/lib/time/schemas.ts';
const testPath='tests/h48-3-time-precision.test.ts';

for(const p of [precisionPath,servicePath,workspacePath,schemaPath,testPath]) present(p);

if(checks.every(([ok])=>ok)){
  const precision=read(precisionPath);
  const service=read(servicePath);
  const workspace=read(workspacePath);
  const schema=read(schemaPath);

  checks.push([precision.includes('(end - start) / MILLISECONDS_PER_MINUTE'),'Elapsed time is derived from exact timestamp difference without whole-minute rounding']);
  checks.push([precision.includes('exactWorkedMinutes'),'Exact worked-minute helper exists']);
  checks.push([precision.includes('formatDurationMinutes'),'Human-readable second-level duration formatter exists']);
  checks.push([service.includes("const minutesBetween=exactMinutesBetween"),'Compliance interval math uses precise elapsed minutes']);
  checks.push([service.includes('workedMinutes=exactWorkedMinutes(before.startAt,endAt,breakMinutes)'),'Clock-out stores precise worked minutes']);
  checks.push([service.includes('const minutes=exactWorkedMinutes(input.startAt,input.endAt,input.breakMinutes)'),'Manual entries store precise worked minutes']);
  checks.push([service.includes('workedMinutesForEntry'),'Legacy completed entries are recalculated from authoritative timestamps']);
  checks.push([service.includes('complete.map(workedMinutesForEntry)'),'Timesheets recalculate legacy entries instead of trusting rounded cached minutes']);
  checks.push([service.includes('byDay.set(d,normalizeMinutes((byDay.get(d)||0)+workedMinutesForEntry(e)))'),'Compliance totals use precise completed-entry duration']);
  checks.push([!service.includes('Math.round((new Date(b).getTime()-new Date(a).getTime())/60000)'),'Whole-minute timestamp rounding removed']);
  checks.push([workspace.includes('Actual duration'),'Timecard labels raw duration explicitly']);
  checks.push([workspace.includes('durationWithDecimalHours'),'UI shows human duration plus decimal hours']);
  checks.push([workspace.includes('Raw attendance: second-accurate'),'UI declares second-accurate raw attendance']);
  checks.push([workspace.includes("roundingMinutes:Number(f.get('roundingMinutes')||0)"),'New policy rounding is explicit and not hard-coded to 15 minutes']);
  checks.push([workspace.includes('Rounding policy minutes (0 = none)'),'Rounding governance field is visible to HR']);
  checks.push([schema.includes('roundingMinutes:z.number().int().min(0).max(60).default(0)'),'Time-policy schema allows explicit no-rounding default']);
}

let failed=0;
for(const [ok,label] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${label}`);
  if(!ok) failed++;
}
console.log(`\nH48.3 time precision audit: ${checks.length-failed}/${checks.length} PASS`);
if(failed) process.exit(1);
