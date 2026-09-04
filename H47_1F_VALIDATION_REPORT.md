# H47.1F Validation Report

Status at handoff: **LOCK CAPTURE REQUIRED ON WINDOWS**.

Static H47.1F configuration and audit checks are performed in the bootstrap package. H47.1E is already Windows-certified. The authoritative H47.1F gate is the Windows lock-freeze workflow followed by `RUN_OPSIQO_H47_1F_VALIDATION.ps1`.

Required final line:
`H47.1F OPSIQO EMPLOYEE MOBILE REPRODUCIBLE BUILD BASELINE: PASS`

The final Windows-generated ZIP must contain `mobile/package-lock.json` and a source manifest that verifies after the lock is frozen.
