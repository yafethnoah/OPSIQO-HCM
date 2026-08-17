# OPSIQO HCM v3.6.1 build-fix overlay 2

Fixes discovered by the real Windows dependency-aware gate run:

1. Next.js 16.2.12 + TypeScript 7.0.2 production build: enables `experimental.useTypeScriptCli` in `next.config.ts` so Next.js invokes the project-local TypeScript CLI instead of the unavailable TypeScript 7 compiler API.
2. `ai:governance-check`: removes top-level await and runs the async workflow through `main().catch(...)`, compatible with the project CommonJS/tsx execution mode.
3. Carries the final explicit `Interview` filter callback type that reduced `npm run typecheck` to zero errors.
4. Regenerates the exact-tree `SOURCE_MANIFEST.sha256` for these final source changes.

After applying, rerun:
- npm run typecheck
- npm test
- npm run test:rules
- npm run build
- npm run ai:evaluate
- npm run ai:governance-check
- npm run security:static-scan
- node scripts/source-manifest.mjs verify
- npm run release:gate
