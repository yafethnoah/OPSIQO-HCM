# Start Here — OPSIQO ONE v7.14

This package is the V7.14 source release candidate for Organization Launchpad, Daily Brief, adaptive navigation, multilingual intelligence, global mobile outcome navigation and privacy-safe PWA/low-bandwidth foundations.

## Windows certification
1. Extract the ZIP into a new folder.
2. Open PowerShell in that folder.
3. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_14_VALIDATION.ps1
```

The runner verifies the frozen source **before** dependency installation, installs the exact lockfile dependencies, runs V7.14 and backward audits/tests, Firestore Rules, security scan, production build, release gate and final source verification. It does not deploy Firebase/App Hosting and is designed not to print secret values.

## Recommended UAT sequence
1. **Organization Launchpad** — preview a profile; verify proposed departments/packs; confirm explicit review; apply; inspect checklist.
2. **Marketplace safety** — confirm selected packs install disabled and require a separate workflow-enable action.
3. **Daily Brief** — verify only permission-visible action/due items and one evidence-backed insight appear.
4. **Adaptive navigation** — visit/pin known pages; confirm `For you` updates without exposing record IDs.
5. **Zero-search navigation** — search using intent/keywords rather than exact menu labels.
6. **Multilingual intelligence** — change locale; confirm Ask OPSIQO response language and Arabic RTL direction; verify canonical evidence IDs remain unchanged.
7. **Mobile navigation** — verify Home/My Work/People/Intelligence/More remain reachable from deeper pages.
8. **Connectivity/PWA** — test offline and save-data messaging; verify authenticated HR/API data is not served from cache.
9. **Security regressions** — confirm consequential employment actions remain human governed and MFA terminal states remain correct.

## Local development after certification
Backend:

```powershell
npm run dev:backend
```

Frontend in a second PowerShell window:

```powershell
npm run dev:frontend
```
