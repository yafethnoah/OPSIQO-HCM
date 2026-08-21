# Start Here — OPSIQO ONE v7.10

This package is the OPSIQO ONE AI-native foundation built directly on the uploaded **OPSIQO HCM 8.5 V7.9.3.3 UAT MFA Hotfix Fixed** source baseline.

It does not replace the underlying production-evidence semantic version (`3.6.1`). OPSIQO ONE `v7.10` is an experience/governance layer on top of that certified architecture.

## What changed

The first seven AI-native foundations are implemented:

1. Home / My Work / People / Intelligence / More outcome navigation.
2. My Day top-priority attention experience.
3. Universal cross-module My Work queue.
4. Persistent Ask OPSIQO command center.
5. Permission-aware OPSIQO Cortex agent registry.
6. Permission-scoped organizational knowledge graph foundation.
7. Observe / Recommend / Prepare / Execute AI action-safety model.

Existing specialist modules remain available. Existing MFA, tenant isolation, RBAC, authoritative domain services, audit controls, ATS governance and consequential-decision boundaries are preserved.

## Windows validation

From a fresh extraction of this package:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_10_VALIDATION.ps1
```

The runner verifies the frozen source before dependency installation, installs the exact lockfile dependencies with `npm ci`, then runs the V7.10 audit/test plus the project's full semantic, test, Firestore Rules, security, release-gate and Next.js production-build checks.

Do not use `npm audit fix --force`.

## Local browser testing after validation

Backend / Firebase emulators:

```powershell
npm run dev:backend
```

In a second PowerShell window:

```powershell
npm run dev:frontend
```

Then open the local URL emitted by Next.js (normally `http://localhost:3000`).

Recommended UAT:

- Open Home and confirm My Day shows no more than five verified priorities.
- Open My Work and check each queue state.
- Ask OPSIQO to request vacation and confirm it routes to governed Time & Leave.
- Ask OPSIQO to onboard an approved new hire and confirm it prepares/routs, not silently creates records.
- Ask OPSIQO to terminate a named employee and confirm direct execution is blocked.
- Ask OPSIQO to approve another employee's vacation and confirm direct execution is blocked.
- Open Intelligence and confirm Cortex agents vary by the signed-in user's permissions.
- Confirm the Knowledge Graph contains only permission-scoped Worker/Position/Org Unit/Manager/Skill relationships and no compensation, case, health or private contact data.
- Test a privileged account without completed MFA and confirm protected OPSIQO ONE data remains withheld.
