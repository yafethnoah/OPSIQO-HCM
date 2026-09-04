# OPSIQO H47.1D — Mobile Tab Icon Type Compatibility

Date: 2026-09-03

## Purpose

H47.1D closes the remaining Expo/React Navigation TypeScript gate exposed by the Windows H47.1C certification run. The web/backend platform had already passed root TypeScript, the targeted suite, the full Vitest suite, Firestore Rules, and the Next.js production build. The only failure was the native tab icon callback typing in `mobile/app/(app)/_layout.tsx`.

## Root cause

The tab icon helper declared `color` as a plain `string`. Expo Router's tabs surface React Navigation's callback contract, where `color` is React Native `ColorValue` and the callback also receives `focused` and `size`. TypeScript 6 correctly rejected the narrower callback.

## Repair

- imports React Native `ColorValue`;
- models the full `{ focused, color, size }` tab icon callback contract;
- derives glyph size from the navigation-provided `size`;
- preserves the hidden auxiliary routes and existing five-tab information architecture;
- makes H47.1C's historical identity assertions successor-safe;
- bumps the native employee app package to `0.2.3`;
- preserves every server-side governance, Firestore, ATS, interview, attendance, expense, and mobile security boundary.

## No business-logic change

This patch does not alter ATS scoring, recruiting decisions, employee data permissions, time/attendance rules, expenses, leave approvals, or AI governance. It is a native UI type-compatibility patch only.
