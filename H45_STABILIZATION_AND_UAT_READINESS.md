# OPSIQO H45 — Stabilization + UAT Readiness

H45 consolidates the blockers observed during H43/H44 browser UAT into one controlled source release.

## Recruiting readiness
- explicit Recruiting readiness panel with Open requisitions, interview-eligible applications, Recruiting AI status, duplicate active-title warnings, and runtime release identity;
- direct UAT identity marker from `/api/health` so testers can prove which feature release is deployed;
- dedicated `RECRUITING_ATS_MODEL` / `RECRUITING_ATS` readiness evaluation without exposing credentials;
- governed Recruiting AI setup card using the existing draft + independent-approval APIs;
- direct navigation to AI governance from Recruiting and Settings;
- scanned/image PDF failures use user-safe configuration guidance instead of raw governance internals;
- text-layer resumes continue deterministic parsing when governed AI is unavailable;
- interview kits continue deterministic generation when governed AI is unavailable.

## Structured interview hardening
- generated draft core questions are no longer published to the reusable requisition question bank;
- standardized question bank updates occur only after a human locks the interview kit;
- repeat locking is idempotent;
- regenerating/locking requires recruiting-management authority;
- scorecard submission is restricted to assigned interviewers;
- every scored criterion requires job-related evidence text;
- panel variance compares interviewer-level averages rather than variation among questions inside one interviewer's scorecard;
- recommendation distribution is visible without making an employment decision.

## Authentication reliability
- local Firebase Auth/Firestore/Storage emulator origins are allowed by CSP only in development;
- production CSP remains HTTPS-only;
- raw `auth/user-not-found`, wrong-password and invalid-credential messages are replaced by a non-enumerating sign-in message;
- network failures receive a user-facing connectivity message;
- password reset preserves account-enumeration resistance.

## Release identity
- default product marker: `8.5-v7.32-H45`;
- feature marker: `H45`;
- `/api/health` exposes the feature marker together with source commit/runtime revision when the deployment platform provides them.

H45 does not auto-approve AI governance, auto-open requisitions, auto-close duplicate requisitions, or make automated hiring/rejection decisions.
