import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const service=fs.readFileSync('src/lib/time/service.ts','utf8');
const workspace=fs.readFileSync('src/components/time-workspace.tsx','utf8');
const domain=fs.readFileSync('src/domain/time.ts','utf8');

describe('H48.6 administrator timesheet override governance',()=>{
  it('limits self-approval override to organization and super administrators',()=>{
    expect(service).toContain("const timesheetSelfApprovalOverrideRoles=new Set(['super_admin','org_admin']);");
    expect(service).toContain("if(selfDecision&&!selfApprovalOverride)throw new ApiError");
  });

  it('requires a meaningful override reason server-side',()=>{
    expect(service).toContain('self_approval_override_reason_required');
    expect(service).toContain('input.note.trim().length<10');
  });

  it('writes explicit self-approval audit evidence',()=>{
    expect(service).toContain('timesheet.${input.action}.self_override');
    expect(service).toContain('selfApprovalOverride:true');
    expect(service).toContain('overrideReason:input.note?.trim()');
    expect(service).toContain('overrideRole:actor.role');
  });

  it('preserves governed approval evidence during precise timesheet rebuilds',()=>{
    expect(domain).toContain('selfApprovalOverrideReason?: string;');
    expect(service).toContain('selfApprovalOverrideReason:prev?.selfApprovalOverrideReason');
    expect(service).toContain("approvedByRole:input.action==='approve'?actor.role:undefined");
  });

  it('shows human employee identity in the approval queue',()=>{
    expect(service).toContain('workerName:sheetWorkerMap[s.workerId]?.displayName||s.workerId');
    expect(service).toContain("employeeNumber:sheetWorkerMap[s.workerId]?.employeeNumber||''");
    expect(workspace).toContain('r.workerName||r.workerId');
    expect(workspace).toContain('r.employeeNumber');
  });

  it('keeps the administrator own-timesheet decision actionable but governed',()=>{
    expect(workspace).toContain("(selected!==myWorkerId||canAdminSelfOverride)");
    expect(workspace).toContain('Approve with admin override');
    expect(workspace).toContain('Administrator timesheet override');
    expect(workspace).toContain('overrideReason.trim().length<10');
  });

  it('preserves H48.5 live-attendance synchronization integration',()=>{
    expect(workspace).toContain("announceAttendanceChanged(action)");
  });
});
