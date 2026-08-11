# Upgrade to OPSIQO HCM v1.6

## From v1.5
1. Back up Firestore and Storage.
2. Install dependencies and generate/commit `package-lock.json`.
3. Review/deploy `firestore.indexes.json`, `firestore.rules` and existing Storage rules.
4. Run `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run build`.
5. Run the seed only in a development/test tenant.
6. Confirm safety permissions for HR Partner, HR Admin, managers and employees.
7. Configure the H&S governance profile for each operational workplace rather than relying on the seeded Ontario example.
8. Validate reporting targets with qualified H&S/legal personnel for your sector and workplace.
9. Run `npm run safety:review` in staging and verify deduplication/escalations.
10. Complete `PHASE3_ACCEPTANCE.md` before production deployment.

No migration invents historical incidents, claims or statutory submissions. Historical safety data should be imported only from trustworthy source records.
