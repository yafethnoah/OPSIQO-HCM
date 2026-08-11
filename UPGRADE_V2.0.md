# Upgrade to v2.0 — AI HR Copilot & Evidence-to-Action Intelligence

## 1. Install and verify dependencies
```powershell
npm install --registry=https://registry.npmjs.org
npm run typecheck
npm test
npm run test:rules
npm run build
```
Commit the generated `package-lock.json` and use `npm ci` in CI.

## 2. Deploy Firebase changes
Deploy the updated Firestore indexes and Security Rules. v2.0 adds server-only collections for AI prompt/model governance, AI runs and action plans.

## 3. Configure provider secrets
Development may use:
```env
OPSIQO_AI_PROVIDER=demo
OPSIQO_REQUIRE_GOVERNED_AI_CONFIG=false
```

Production should use an approved remote provider and require governed configuration, for example:
```env
OPSIQO_AI_PROVIDER=openai
OPENAI_API_KEY=<secret-manager-value>
OPENAI_MODEL=<approved-fallback-model>
OPSIQO_REQUIRE_GOVERNED_AI_CONFIG=true
OPSIQO_AI_MAX_EVIDENCE_ITEMS=18
```

The environment model is a fallback/consistency check; the active Firestore model profile is the governed runtime selection. Credentials never belong in the model-profile record.

## 4. Create governance records
In `/ai-copilot` → Governance:
1. Create a draft `HR_COPILOT` prompt version.
2. Have a different authorized approver activate it.
3. Create a draft model profile with provider, model ID, purpose and data-handling note.
4. Have a different authorized approver activate it.
5. Do not retire the currently active prompt/model until a replacement is active.

The local seed creates a demo prompt/model profile for emulator testing only.

## 5. Run AI governance validation
```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run ai:evaluate
npm run ai:governance-check
npm run preflight:production
```

## 6. Smoke-test governed usage
Test at minimum:
- safe aggregate workforce question → answer with valid OPSIQO citations;
- individual termination-selection request → blocked;
- candidate-ranking request → blocked;
- hallucinated citation regression test → invalid evidence ID discarded;
- recommendation → draft action plan → independent approval → workflow event.

## 7. Records/privacy governance
Before go-live, approve:
- AI run/question/answer retention schedule;
- provider data handling and residency configuration;
- access roles for `ai.use`, `ai.manage`, `ai.approve`, `ai.audit`;
- privacy/algorithmic impact assessment requirements;
- model/prompt change-management and regression-evaluation threshold.
