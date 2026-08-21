# OPSIQO ONE V7.31 — Start Here

**Overall project progress: 99.97%**

V7.31 is a narrow source-closure release. It does not add broad HR architecture or expand autonomous AI authority.

## What changed

- Runtime localization added for Skills Passport, Manager Copilot, Career GPS, Talent Marketplace, Automation Marketplace, Automation Control, Contract Import, People, Manager Portal, Lifecycle Command Center, Organization Launchpad, Employee Concierge and Secure Preboarding.
- Program Portfolio extends its existing locale-native EN/FR/ES/AR labels.
- Translation inventory now reports **3,320 reviewed candidate strings** and **213 measured candidates remaining** across **64 governed surfaces**.
- Authenticated browser UAT now includes the newly localized authenticated routes.
- Technical API paths are explicitly excluded from translation.
- Safe Execute remains limited to `notifications.mark_visible_read`.

## Windows certification

Run from a short clean path such as `D:\opsiqo\v731`:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_31_VALIDATION.ps1
```

The runner does not intentionally print secret values and does not deploy Firebase/App Hosting.

A successful automated run is evidence of automated certification only. Manual accessibility, connector UAT, release/change approval and controlled production deployment remain separately attested.
