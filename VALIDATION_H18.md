# OPSIQO V7.32 H18 Validation

H18 is a narrow TypeScript/localization ownership repair based on the H17 Windows certification failure.

## Windows evidence from H17

The H17 run reached Semantic TypeScript after all source/hotfix audits passed, then failed only with TS2304 because the nested `Copilot` child referenced `translationRoot` outside its scope.

## H18 source validation target

- H18 audit must pass.
- V7.32 and H11-H17 dependency-free audits must remain green.
- Translation inventory must remain 3528/3528 with zero measured backlog.
- Frozen source manifest and clean-release audit must pass.
- The authoritative dependency-backed proof remains the Windows `RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1` run, including Semantic TypeScript, Vitest, Firestore Rules, build and authenticated browser UAT.
