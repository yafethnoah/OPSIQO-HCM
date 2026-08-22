# OPSIQO V7.32 H24 UAT Runtime Hotfix

- Runtime locale propagation from organization settings to the live shell.
- Arabic applies `lang=ar`, `dir=rtl`, and existing reviewed translations immediately.
- My OPSIQO follows the live shell locale when its preference is Auto.
- Expired organization sessions redirect to fresh sign-in instead of leaving loading states stuck.
- Employee numbers are server-assigned as `EMP-000001`, `EMP-000002`, ... when omitted.
- Direct Core HR, recruiting hire conversion, and prehire/onboarding no longer require manual employee-number entry.
- Recruiting dependent dropdowns are constrained to applicable organization units, positions, active workers, eligible applications, interviews, and accepted offers.
- Empty/inapplicable critical dropdowns disable their dependent action rather than submitting invalid values.
- People manager dropdown excludes inactive workers.

Boundary: no production deployment is performed by this hotfix. Full regression, manifest regeneration, certification, UAT and human sign-off remain required.
