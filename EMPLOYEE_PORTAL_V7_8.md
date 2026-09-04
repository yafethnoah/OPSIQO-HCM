# OPSIQO HCM 8.5 V7.8 — Employee Self-Service Portal

V7.8 adds a dedicated employee-facing front door at `/employee`. It reuses OPSIQO's governed HR services while keeping employees strictly scoped to their own employment record and permitted self-service actions.

## Role-aware landing

- Employee → `/employee`
- Manager → `/home`
- HR / privileged administration → `/dashboard`
- Explicit safe `returnTo` deep links continue to take precedence.
- An employee who accepts an organization invitation is directed to the Employee Portal after membership activation.

## Employee Portal services

The portal exposes only services allowed by the employee's effective permissions, including:

- My HR profile
- Time & Leave
- Documents & Policies
- Learning
- Performance
- Pay & Rewards
- Career
- HR Help / Service Center
- Safety reporting
- Notifications

The portal summarizes useful personal indicators such as available leave, open HR requests, assigned learning, goals, documents and notifications.

## Vacation and leave

Employees can submit vacation or other leave requests directly from the portal. The client always submits the authenticated membership's `workerId`, and the existing authoritative time/leave service blocks employees from creating requests for any other worker.

Approval is not automated away: the request enters the existing governed leave workflow for manager/HR review according to organization policy.

Employees can also see their own leave balance and personal request history.

## HR Service Center

Employees can open HR support/service requests from the same portal and track their own requests by reference number and status. Existing service APIs scope non-HR users to `requesterWorkerId === actor.workerId`.

## Privacy and authorization

The employee role remains a self-service role. V7.8 does not grant HR administration capabilities such as `people.manage`, `leave.manage`, or `service.manage`.

If a signed-in membership is not linked to an employee/worker record, personal transactions fail closed and the portal explains that the employee record link must be completed before personal HR transactions can be submitted.

V7.8 therefore creates a usable Employee Experience layer without weakening the existing RBAC, tenancy, human-approval or audit boundaries.
