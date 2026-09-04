# OPSIQO 8.5 V7.1 dependency security policy

This release uses an exact, reviewed dependency baseline. The source and lockfile must remain aligned before release gates are run.

## Prohibited on a release candidate

Do not run:

```powershell
npm audit fix --force
```

`--force` permits npm to rewrite direct dependencies across major-version boundaries. That can invalidate APIs used by OPSIQO even when the resulting dependency tree still installs successfully.

## Approved workflow

1. Start from the signed release ZIP.
2. Run `npm run opsiqo85:dependency-baseline:audit`.
3. Run `npm ci`.
4. Run `npm run opsiqo85:dependency-baseline:audit -- --installed`.
5. Run `npm audit` or export `npm audit --json` as evidence only.
6. Remediate vulnerabilities through a deliberate dependency-upgrade change set with TypeScript, tests, Firestore Rules, build, security scan, runtime UAT and source-manifest evidence.

The dependency audit report is evidence of risk; it is not authorization to rewrite the release dependency graph automatically.
