# Upgrade to OPSIQO HCM v1.5

1. Back up Firestore/Storage.
2. Deploy v1.5 Firestore indexes and server code.
3. Generate and commit `package-lock.json`, then use `npm ci` in CI.
4. Review `er.*` permissions and case-team assignment procedures.
5. Configure confidential ER retention and legal-hold procedures.
6. Validate workplace harassment/violence policies, alternate reporting routes, immediate-assistance procedures, investigation practices, target-extension rules and required written result notices.
7. Validate accommodation privacy/data-minimization practices.
8. Run `npm run er:review` in staging.
9. Run lifecycle UAT with an HR Admin identity.
10. Perform privacy/security/legal UAT before migrating real case files.

11. Review `REFERENCES.md` and have Ontario/legal/collective-agreement configuration approved before production use.
