# OPSIQO H50.4A — Governed AI UAT Closure

## Root causes repaired

1. **AI Copilot dashboard deadlock**
   The dashboard called the fail-closed active prompt/model resolvers. With
   OPSIQO_REQUIRE_GOVERNED_AI_CONFIG=true and no active baseline, the dashboard
   returned 503 before the user could reach governance/setup controls.

2. **Initializer existed but was not visible on the tested surfaces**
   H50.4 already had the governed, audited initializeGovernedAi() path. H50.4A
   exposes that same path on AI Copilot and AI Governance. It does not create
   browser-side credentials or bypass server governance.

3. **Read/advisory POST errors were labeled as uncertain writes**
   The HTTP client treated every POST 5xx as a potentially ambiguous
   authoritative write. Known server-side AI configuration failures are now
   preserved as structured errors. AI generation calls also declare their
   advisory/non-authoritative server-error semantics.

4. **Infinite-looking loading state**
   AI Copilot now stops on a terminal load error and offers Retry rather than
   rendering a loading state indefinitely.

## Safety boundaries preserved

- AI query execution still fails closed until an active governed prompt and
  active governed model profile exist.
- Provider credentials remain server-side and are never displayed.
- Existing H50.4 bootstrap authorization and audit event remain authoritative.
- Consequential employment decisions remain blocked.
- Direct authoritative HCM writes remain blocked from AI generation.
- The global OPSIQO command safe-execute path retains write reconciliation.
- No Firebase, UAT, or production resource is changed by this patch.