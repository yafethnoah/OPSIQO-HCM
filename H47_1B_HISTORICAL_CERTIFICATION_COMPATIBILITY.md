# OPSIQO H47.1B — Historical Certification Compatibility

H47.1B is a narrow successor to H47.1A. It does not change the H47.1 mobile feature set. It repairs two historical regression contracts exposed by the Windows full-suite certification gate.

## Repairs

1. **H41 resume safety ordering** — `clearParsedValues(form)` is again the first operation in the failed-parse catch block, preserving the fail-closed candidate-field clearing contract.
2. **H45 release-marker regression test** — the historical H45 readiness test now verifies an explicit H45-or-later feature lineage instead of requiring H45 to remain the current runtime release forever. Current release identity remains H47 with patch H47.1B.
3. **Targeted certification coverage** — H41 PDF safety and H45 readiness tests run in the targeted gate before the full Vitest suite.

No protected-trait logic, ATS decision boundary, employee-mobile permission boundary, geofence policy, expense approval workflow, or consequential-action rule is weakened by this patch.
