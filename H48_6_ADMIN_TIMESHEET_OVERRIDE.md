# OPSIQO H48.6 — Administrator Timesheet Override & Approval Identity

Base
----
Certified H48.5:
6d720f147e074fc1565e15f23386dc0afbf371d9

Purpose
-------
Allow an Organization Administrator or Super Administrator to act on their own
submitted timesheet when an independent approver is unavailable, without
weakening the default segregation-of-duties rule for employees, managers,
HR Partners, or HR Administrators.

Governed behavior
-----------------
- employee / manager / hr_partner / hr_admin:
  self-approval remains blocked
- org_admin / super_admin:
  own submitted timesheet remains actionable
- admin self-decision requires a reason of at least 10 characters
- override action is explicitly audited as timesheet.<action>.self_override
- audit metadata records override role, reason, worker, and approver worker
- approval record persists approver role, worker ID, approval note, and override evidence
- precise timesheet recalculation preserves approval evidence

Approval queue UX
-----------------
- Shows employee display name and employee number instead of internal worker UUID
- Self-admin rows are visibly labelled "Self · admin override required"
- Own submitted timesheet exposes "Approve with admin override" / "Reject with admin override"
- Controlled inline review panel requires an override reason before confirmation

No deployment is performed by this patch.
