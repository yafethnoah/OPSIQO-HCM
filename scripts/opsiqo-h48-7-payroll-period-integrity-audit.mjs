import fs from 'node:fs';

const workspace=fs.readFileSync('src/components/time-workspace.tsx','utf8');
const service=fs.readFileSync('src/lib/time/service.ts','utf8');
const route=fs.readFileSync('src/app/api/organizations/[orgId]/time/payroll-export/route.ts','utf8');

const checks=[];
function check(name,ok){checks.push({name,ok:Boolean(ok)});console.log(`${ok?'PASS':'FAIL'}  ${name}`);}

check('Payroll export no longer derives the period with isoDate(new Date())',
  !workspace.includes('isoDate(new Date())'));
check('UTC slice helper removed from payroll workspace',
  !workspace.includes("const isoDate=(d:Date)=>d.toISOString().slice(0,10);"));
check('Payroll period has explicit start state',
  workspace.includes("[payrollPeriodStart,setPayrollPeriodStart]"));
check('Payroll period has explicit end state',
  workspace.includes("[payrollPeriodEnd,setPayrollPeriodEnd]"));
check('Default payroll period comes from authoritative timecard week',
  workspace.includes("setPayrollPeriodStart(v=>v||t.data.weekStart)") &&
  workspace.includes("setPayrollPeriodEnd(v=>v||t.data.weekEnd)"));
check('Payroll start date is editable',
  workspace.includes('aria-label="Payroll period start"'));
check('Payroll end date is editable',
  workspace.includes('aria-label="Payroll period end"'));
check('Payroll export validates explicit ISO calendar dates',
  workspace.includes("Select a valid payroll period start and end date."));
check('Payroll request URI uses explicit selected period',
  workspace.includes('periodStart=${encodeURIComponent(start)}&periodEnd=${encodeURIComponent(end)}'));
check('Payroll UI documents no UTC conversion',
  workspace.includes('they are not derived with UTC conversion'));
check('Payroll UI documents full-containment rule',
  workspace.includes('fully contained inside these boundaries'));
check('Server requires approved timesheets',
  service.includes(".where('status','==','approved')"));
check('Server uses full-containment period semantics',
  service.includes('.filter(t=>t.weekStart>=periodStart&&t.weekEnd<=periodEnd)'));
check('Legacy overlap semantics removed from payroll export',
  !service.includes('.filter(t=>t.weekEnd>=periodStart&&t.weekStart<=periodEnd)'));
check('Server bounds payroll range to 366 calendar days',
  service.includes("periodDays>366") && service.includes("invalid_period_range"));
check('Payroll export remains HR-admin governed',
  service.includes("if(!adminRoles.has(actor.role))throw new ApiError(403,'Payroll export requires HR administrator permission.'"));
check('Payroll export run evidence is preserved',
  service.includes("run:PayrollExportRun={id,periodStart,periodEnd,status:'generated'"));
check('Payroll export audit is preserved',
  service.includes("action:'payroll_export.generate'"));
check('Employee number remains in payroll CSV',
  service.includes('employee_number,employee_name'));
check('Regular hours remain in payroll CSV',
  service.includes('regular_hours'));
check('Overtime hours remain in payroll CSV',
  service.includes('overtime_hours'));
check('Paid leave hours remain in payroll CSV',
  service.includes('paid_leave_hours'));
check('Total worked hours remain in payroll CSV',
  service.includes('total_worked_hours'));
check('Payroll route remains permission guarded',
  route.includes("requirePermission(actor,'payroll.export')"));
check('Payroll route disables browser/CDN caching',
  route.includes("'cache-control':'no-store, max-age=0'") && route.includes("'cdn-cache-control':'no-store'"));
check('H48.6 administrator override remains in workspace',
  workspace.includes('Administrator timesheet override') && workspace.includes('SELF_APPROVAL_OVERRIDE'));
check('H48.5 attendance synchronization remains integrated',
  workspace.includes('announceAttendanceChanged(action)'));

const failures=checks.filter(c=>!c.ok);
console.log(`\nH48.7 payroll period integrity audit: ${checks.length-failures.length}/${checks.length} PASS`);
if(failures.length) process.exit(1);
