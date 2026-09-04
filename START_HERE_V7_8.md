# Start Here — OPSIQO HCM 8.5 V7.8 Employee Portal

V7.8 extends the V7.7 Automation-Max release with a dedicated Employee Self-Service Portal.

## Primary routes

- `/employee` — Employee Portal (default employee landing)
- `/home` — My OPSIQO / manager-oriented home
- `/dashboard` — HR / administrative dashboard
- `/self-service` — My HR profile
- `/time` — Time & Leave workspace
- `/experience` — HR Service / Employee Experience workspace

## Employee capabilities

Employees can use the new portal to request vacation/leave, track leave requests, request HR support, track HR tickets, and reach their own documents, learning, performance, compensation, career, safety and notification experiences when permitted.

The portal is self-scoped. Consequential approvals and HR administration remain governed by role permissions and human authorization.

## Full Windows validation

From an extracted clean copy:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_8_5_V7_8_EMPLOYEE_PORTAL_VALIDATION.ps1
```

The validation runner verifies the frozen source manifest before and after all gates and never regenerates it.
