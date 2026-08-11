# Upgrade to OPSIQO HCM v2.7

1. Replace the v2.6 source tree with this v2.7 release while preserving environment-specific secrets outside source control.
2. Generate a trusted `package-lock.json` from the approved npm registry and commit it.
3. Deploy the updated Firestore Rules before enabling the new Resilience Center.
4. Assign `resilience.read/manage/approve/audit/incident` according to segregation-of-duties policy. Do not grant approval authority to workflow creators merely for convenience.
5. Create and independently approve critical-role registers, workforce BIAs and continuity plans before relying on readiness scores.
6. Configure recurring execution of `npm run resilience:review` under the existing protected job runner.
7. Run typecheck, unit tests, Firestore Rules tests, build, AI governance checks, production preflight and Lifecycle UAT.
8. Treat all readiness/risk outputs as operational decision support, not legal or certification conclusions.
