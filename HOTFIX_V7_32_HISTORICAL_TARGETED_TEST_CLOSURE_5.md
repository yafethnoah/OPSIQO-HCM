# OPSIQO ONE V7.32 Historical Targeted Test Closure Hotfix 5

Date: 2026-08-20
Product version: OPSIQO ONE V7.32 / HCM 8.5
Hotfix scope: certification regression harness only

## Trigger
The authoritative Windows certification advanced through Windows PowerShell compatibility, machine preflight, frozen-source verification, local `.env.local` certification overlay, locked `npm ci`, locked toolchain preflight, V7.32 source audit, translation verification, Semantic TypeScript, the historical source-audit lineage, and targeted tests from V7.32 through V7.24. It then failed in `tests/opsiqo85/opsiqo-one-v7-23.test.ts` because that historical test required `remainingCandidates > 2000` even though V7.32 has legitimately closed the measured static translation backlog to zero.

## Fix
Historical translation-readiness targeted tests V7.18 through V7.23 are now forward-compatible with later releases:
- each release keeps its original minimum reviewed-source coverage floor;
- total candidate reconciliation remains required;
- a later release may reduce `remainingCandidates` to zero;
- the current boundary must still state that browser and human review remain required.

No translation content was removed. No current V7.32 localization claim was weakened.

## Fail-fast runner improvement
The complete V7.32-to-V7.10 targeted-test chain now runs immediately after Semantic TypeScript and before the verbose historical source-audit chain. This preserves all gates while surfacing executable regression failures sooner.

## Safety boundary
This hotfix does not change:
- HCM business logic;
- tenant isolation;
- MFA behavior;
- Firestore rules;
- ATS decision boundaries;
- AI authority;
- Safe Execute (still only `notifications.mark_visible_read`);
- consequential-employment blocking;
- production deployment behavior;
- human accessibility / connector / change / deployment sign-off requirements.

## Certification boundary
The packaging environment did not complete a locked dependency install, so executable Vitest results for the modified V7.18-V7.23 tests remain authoritative only on the Windows certification machine. Source audits, syntax checks, PowerShell compatibility, clean-release, manifest and ZIP integrity are validated in the packaged tree.
