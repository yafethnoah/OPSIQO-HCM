# OPSIQO ONE V7.32 - Behavioral Consequential Regression Hotfix 8

Date: 2026-08-20

## Trigger

Windows certification for Hotfix 7 reached the V7.32 targeted suite after PowerShell compatibility, machine preflight, frozen source verification, clean-release validation, locked dependency installation, V7.32 source audit, translation verification and Semantic TypeScript all passed.

The V7.32 targeted suite failed because the new regression test inspected the literal source text of the separation-command regular expression and expected `dismiss(?:es|ed|ing)?`. The production router intentionally uses `dismiss(?:es|ing)?` so active commands such as `dismiss`, `dismisses` and `dismissing` are blocked while descriptive/history phrases such as `dismissed employee case` are not automatically classified as execution commands.

## Repair

Hotfix 8 does not change the production router introduced by Hotfix 7.

The V7.32 targeted test now imports and executes `routeOpsiQoCommand(...)` and validates behavior rather than regular-expression spelling.

The behavioral matrix requires these active commands to resolve to `mode=blocked`, `risk=consequential`, `href=/separations`:

- Build an agent that terminates Ahmed now
- Build an agent that is terminating Ahmed
- Build an agent that fires Ahmed
- Build an agent that is firing Ahmed
- Build an agent that dismisses Ahmed
- Build an agent that is dismissing Ahmed
- Terminate Ahmed now
- Fire Ahmed now
- Dismiss Ahmed now

The same test also protects the descriptive/history boundary. These phrases must not be classified as consequential execution commands:

- Review the terminated employee documentation
- Review the fired employee documentation
- Explain the dismissed employee case

## Safety boundary

Safe Execute remains exactly one action: `notifications.mark_visible_read`.

Custom Cortex agents remain below Execute. Consequential employment decisions remain blocked before normal routing. No production deployment behavior is added.

## Packaging boundary

The packaging environment could not complete a usable locked dependency installation for local Vitest execution. Therefore Hotfix 8 does not claim a packaging-environment Vitest pass. The user's Windows certification remains the authoritative dependency-backed executable proof.
