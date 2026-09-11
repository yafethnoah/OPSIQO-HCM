# OPSIQO H51.31 — Record Graph + Transactional Resume Repair

Parent: H51.30
Parent SHA: `499514c22d1259becba2c98c10d1a6814a5adcdf`

## Live H51.30 defects addressed

- incomplete duplicate `Human Resources & Governance Practicum` record
- narrative text leaking into employment entities
- volunteer/community work misclassified as employment
- missing-end-date incorrectly implying Current
- Loyalist College location contamination such as `Ontario (`
- expected graduation not recovered from a neighboring wrapped line
- experience changing because invalid/duplicate records entered duration math
- semantic skill fragments such as standalone `Board`
- AI repair improving one category without reliably reducing critical structure issues

## Architecture

H51.31 treats a resume as a local evidence relationship graph:

1. identify semantic sections and local evidence neighborhoods
2. classify role / organization / education / volunteer / narrative spans
3. create relationships only inside the same source neighborhood
4. migrate volunteer/community/pro-bono records out of employment
5. merge partial + complete duplicate records
6. require explicit source evidence for Current status
7. sanitize and validate before experience duration math
8. run targeted AI repair only against unresolved structural issues
9. accept a proposed AI repair only when critical structure improves without
   material coverage regression; otherwise roll it back
10. preserve the original resume as the evidence boundary for Fit %

Final candidateVerificationGate remains fail-closed.
Production remains untouched during H51.31 source certification.
