# OPSIQO ONE V7.29 — Start Here

V7.29 is the **Final Release Attestation** source release for OPSIQO HCM 8.5.

## Overall project progress
**99.75%** — source architecture and release controls are complete; the remaining work is dependency-backed certification and required human/production sign-off.

## What changed
- conflict-safe global reuse of exact reviewed EN/FR/ES/AR translations;
- ambiguous translation conflicts stay surface-specific;
- final production readiness separates source, dependencies, browser UAT, manual accessibility, connector UAT, change approval and actual deployment;
- one human sign-off template replaces scattered informal approval evidence;
- V7.29 certification runner uses isolated Firebase emulators and performs no production deployment;
- Safe Execute remains limited to `notifications.mark_visible_read`.

## Windows certification
Extract to a short clean path such as `D:\opsiqo\v729`, then run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_29_VALIDATION.ps1
```

The runner does not intentionally print secret values and does not deploy Firebase/App Hosting. A passing runner means automated certification passed; human production sign-offs remain separate in `artifacts\v7-29-final-release-attestation.json`.
