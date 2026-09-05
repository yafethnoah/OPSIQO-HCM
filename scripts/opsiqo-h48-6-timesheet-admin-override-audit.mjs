import fs from 'node:fs';

const checks=[];
const service=fs.readFileSync('src/lib/time/service.ts','utf8');
const workspace=fs.readFileSync('src/components/time-workspace.tsx','utf8');
const domain=fs.readFileSync('src/domain/time.ts','utf8');

function check(name,ok){checks.push({name,ok:Boolean(ok)});console.log(`${ok?'PASS':'FAIL'}  ${name}`);}

check('Only super_admin and org_admin receive timesheet self-approval override',
  service.includes("const timesheetSelfApprovalOverrideRoles=new Set(['super_admin','org_admin']);"));
check('Non-admin self-approval remains blocked',
  service.includes("if(selfDecision&&!selfApprovalOverride)throw new ApiError"));
check('Admin self-approval requires a reason',
  service.includes("self_approval_override_reason_required") && service.includes("input.note.trim().length<10"));
check('Self-approval audit action is explicit',
  service.includes("timesheet.${input.action}.self_override"));
check('Self-approval audit metadata is explicit',
  service.includes("metadata:selfApprovalOverride?{selfApprovalOverride:true"));
check('Override reason is written to audit metadata',
  service.includes("overrideReason:input.note?.trim()"));
check('Approver role is persisted',
  domain.includes("approvedByRole?: string;") && service.includes("approvedByRole:input.action==='approve'?actor.role:undefined"));
check('Approver worker identity is persisted',
  domain.includes("approvedByWorkerId?: string;") && service.includes("approvedByWorkerId:input.action==='approve'?actor.workerId:undefined"));
check('Self-approval override evidence is persisted',
  domain.includes("selfApprovalOverride?: boolean;") && domain.includes("selfApprovalOverrideReason?: string;") && domain.includes("selfApprovalOverrideRole?: string;"));
check('Timesheet rebuild preserves approval evidence',
  service.includes("selfApprovalOverride:prev?.selfApprovalOverride"));
check('Submitted timesheets resolve employee names',
  service.includes("workerName:sheetWorkerMap[s.workerId]?.displayName||s.workerId"));
check('Submitted timesheets resolve employee numbers',
  service.includes("employeeNumber:sheetWorkerMap[s.workerId]?.employeeNumber||''"));
check('Dashboard returns enriched submitted timesheets',
  service.includes("leave,timesheets:sheetRows,exceptions"));
check('Time workspace loads authoritative actor role',
  workspace.includes("role:string") && workspace.includes("setActorRole(me.actor.role)"));
check('Client self-override role boundary matches server',
  workspace.includes("['super_admin','org_admin'].includes(actorRole)"));
check('Own submitted timesheet controls are actionable for admins',
  workspace.includes("(selected!==myWorkerId||canAdminSelfOverride)"));
check('Admin self-approval control is explicit',
  workspace.includes("Approve with admin override"));
check('Admin self-rejection control is explicit',
  workspace.includes("Reject with admin override"));
check('Override review panel is present',
  workspace.includes("Administrator timesheet override") && workspace.includes("SELF_APPROVAL_OVERRIDE"));
check('Override reason UI enforces 10 characters',
  workspace.includes("overrideReason.trim().length<10"));
check('Queue displays human employee identity',
  workspace.includes("r.workerName||r.workerId") && workspace.includes("r.employeeNumber"));
check('Queue labels self override requirement',
  workspace.includes("Self · admin override required"));
check('Independent approvals still use normal path',
  workspace.includes("void executeTimesheetDecision(row,action)"));
check('Existing H48.5 attendance synchronization remains imported',
  workspace.includes("announceAttendanceChanged"));
check('Existing time approval permission gate remains present',
  workspace.includes("can('time.approve')"));

const failures=checks.filter(c=>!c.ok);
console.log(`\nH48.6 admin timesheet override audit: ${checks.length-failures.length}/${checks.length} PASS`);
if(failures.length) process.exit(1);
