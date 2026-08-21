# OPSIQO V7.32 H18

H18 closes the Semantic TypeScript regression introduced during H17 accessibility hardening in `src/components/ai-copilot-workspace.tsx`.

## Root cause

`AiCopilotWorkspace` already owned the `translationRoot` ref and translation hook. H17 accidentally attached `ref={translationRoot}` inside the nested `Copilot` function where that variable is out of lexical scope, causing TS2304 during `tsc --noEmit`.

## Repair

- Keep `translationRoot` owned by `AiCopilotWorkspace`.
- Attach it to both the loading root and the loaded top-level workspace root.
- Remove the invalid nested-child ref.
- Preserve H17's explicit `aria-label="Ask OPSIQO question"` accessibility fix.
- Add H18 source audit and targeted regression test to the canonical V7.32 Windows certification runner.

No production deployment behavior, Safe Execute authority, consequential-action governance, secret handling, or external integration behavior is changed.
