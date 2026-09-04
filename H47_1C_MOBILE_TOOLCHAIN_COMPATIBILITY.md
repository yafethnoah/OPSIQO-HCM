# OPSIQO H47.1C — Mobile Toolchain Compatibility

H47.1C is a certification-only stabilization patch on top of H47.1B. It does not change HR workflow behavior.

## Why this patch exists

The Windows H47.1B certification passed the server-side architecture audits, root TypeScript, targeted tests, full Vitest suite, Firestore Rules, and Next.js production build. The remaining failure was isolated to the Expo mobile workspace:

- Expo SDK 57 reported `react-native@0.86.0`, `react-native-safe-area-context@5.6.2`, and `react-native-screens@4.23.0` as incompatible with the installed SDK baseline.
- After Expo aligned those packages interactively, TypeScript 6 rejected the deprecated `baseUrl` option in `mobile/tsconfig.json`.

## H47.1C changes

- Removed deprecated TypeScript `baseUrl` from the mobile workspace.
- Preserved `@/*` aliases using explicit `./src/*` path mappings, which TypeScript resolves relative to the tsconfig file when `baseUrl` is absent.
- Aligned native packages to the versions required by the Windows Expo SDK 57 check:
  - `react-native`: `0.86.3`
  - `react-native-safe-area-context`: `~5.7.0`
  - `react-native-screens`: `~4.26.0`
- Changed the certification runner to set `CI=1` before `expo install --check`, making dependency validation non-interactive and immutable.
- Preserved `expo install --fix` only as an explicit developer repair command (`npm run deps:repair`), never as part of certification.
- Retained independent root and mobile TypeScript gates.
- Retained full Vitest, Firestore Rules, Next.js production build, Expo Doctor, and source-manifest gates.

## Governance boundary

No ATS decision logic, employee data model, attendance rule, expense approval rule, AI action, mobile permission, Firestore rule, or consequential HR action was changed by H47.1C.
