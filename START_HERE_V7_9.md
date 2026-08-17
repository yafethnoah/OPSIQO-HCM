# Start Here — OPSIQO HCM 8.5 V7.9 Enterprise Self-Service

V7.9 extends V7.8 with three coordinated enterprise improvements:

1. **Employee Portal 2.0** — common employee transactions are surfaced as quick HR services while remaining worker-scoped.
2. **Manager Self-Service** — managers land on a dedicated action center for team approvals, risks and services.
3. **Automation Designer 2.0** — durable domain events can be filtered by schema-validated conditions before a workflow run is created.

## Validate the frozen source

On Windows PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_8_5_V7_9_ENTERPRISE_SELF_SERVICE_VALIDATION.ps1
```

The validation runner verifies `SOURCE_MANIFEST.sha256` before and after the gate. It never regenerates the source manifest.

## Employee Portal

Open `/employee`. Employees can request leave, submit HR service tickets, track their requests, and start common services such as personal-information changes, employment letters, benefits support, payroll questions, expense/reimbursement, schedule changes, remote/hybrid work, and equipment/access requests when HR has published those services.

## Publish the standard HR service catalog

An authorized `service.manage` user can open **Experience & HR Help → Admin → Service catalog** and choose **Publish standard services**. The operation is idempotent: existing service codes are retained and only missing standard services are created.

## Manager Self-Service

Managers now land on `/manager` after normal sign-in or invitation acceptance. The page shows direct reports, pending leave approvals, submitted timesheets, manager performance reviews, overdue learning, team compliance signals, prioritized attention items and permission-scoped manager actions.

## Automation Designer 2.0

Open `/workflows`. A workflow can now define optional event filters such as:

```text
Trigger: service.ticket_created
Field:   payload.priority
Op:      eq
Value:   high
```

Conditions are evaluated against the durable domain event before a workflow run starts. No arbitrary expressions or executable code are accepted.

## Governance boundary

Automation does not autonomously decide hiring, rejection, termination, discipline, promotion, succession selection, individual compensation, privileged-access elevation, or legal/policy publication. Those remain human-governed decisions.
