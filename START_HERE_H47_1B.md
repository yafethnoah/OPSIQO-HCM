# Start Here — OPSIQO H47.1B

Extract to a short new folder and do not overwrite H47.1A.

```powershell
Set-Location "D:\opsiqo\windows appweb\OPSIQO_H47_1B"
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_H47_1B_VALIDATION.ps1
```

The validator installs dependencies when required and runs architecture audits, root TypeScript, targeted regressions, full Vitest, Firestore Rules, Next.js production build, isolated mobile dependency checks, mobile TypeScript, Expo Doctor, and immutable source-manifest verification.
