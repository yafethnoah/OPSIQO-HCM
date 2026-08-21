# OPSIQO ONE v7.10 — AI-Native Transformation Foundation

This release turns the existing OPSIQO HCM capability set into the first controlled **OPSIQO ONE** experience layer.

## Implemented foundations

1. **Outcome navigation** — Home, My Work, People, Intelligence, More are now the primary outcome surfaces while specialist modules remain available underneath.
2. **My Day** — Home shows the five highest-priority verified attention items and links to the full work queue.
3. **Universal My Work** — attention and governed AI action plans are aggregated into Needs me, Waiting, AI prepared and Completed states.
4. **Persistent Ask OPSIQO** — authenticated pages expose an outcome-first command bar that routes common tasks and uses the existing governed AI Copilot for evidence-backed analysis.
5. **OPSIQO Cortex foundation** — a permission-aware registry exposes specialized agent capabilities without pretending unavailable services exist.
6. **Organization Knowledge Graph foundation** — permission-scoped current Worker → Position → Org Unit → Manager → Skill relationships are assembled from existing authoritative records. Sensitive contact, compensation, health and case fields are deliberately excluded.
7. **AI Action Safety Model** — Observe → Recommend → Prepare → Execute is explicit. Consequential employment decisions remain blocked from direct command execution.

## Safety boundaries preserved

- MFA enforcement remains unchanged.
- AI does not write directly to Firestore through the new command route.
- Existing authoritative domain services and workflows remain the execution boundary.
- Termination, candidate employment decisions, promotion/demotion/discipline, individual salary changes, approvals/denials, successor selection and personnel-record deletion are not directly executable from Ask OPSIQO.
- The knowledge graph is permission-scoped and bounded.
- Missing source evidence is not fabricated.

## Validation

Run:

```powershell
npm run opsiqo85:opsiqo-one-v7.10:audit
npm run test:opsiqo-one-v7.10
npm run typecheck
npm test
npm run test:rules
npm run build
npm run source:manifest:verify
```

The underlying production-evidence package version remains `3.6.1`; `v7.10` is the OPSIQO ONE experience/foundation layer and must not be confused with the frozen production-evidence semantic package version.
