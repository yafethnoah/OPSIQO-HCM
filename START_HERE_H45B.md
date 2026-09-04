# OPSIQO H45B — Start Here

H45B is the next UAT candidate after H45A.

1. Extract the ZIP to a new folder; do not overwrite the certified H45A baseline.
2. Run `RUN_OPSIQO_H45B_VALIDATION.ps1` from PowerShell.
3. Require the final line `H45B RECRUITING + PARSING + ATS INTELLIGENCE: PASS` before Git promotion.
4. Deploy H45B to UAT only, then verify `/api/health` reports patch release `H45B`.
5. Repeat resume intake → ATS review → schedule interview → automatic kit selection UAT.

H45B preserves the human-decision boundary: ATS and interview intelligence are evidence support only and never automatically reject, advance, hire or infer protected traits.
