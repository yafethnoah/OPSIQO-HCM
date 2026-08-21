# OPSIQO V7.32 H19

## Purpose
Close the three failure families left by the H18 authenticated browser UAT without weakening the release gate.

H18 proved 83/84 certification gates and completed all 69 authenticated routes. Its 147 browser failures were exactly:
- 68 target-size-24
- 68 arabic-rtl-shell
- 11 operational-arabic-translation

## Repairs
1. Shell locale state now initializes from the document and also observes `data-opsiqo-locale`, `lang`, and `dir`, while retaining the explicit locale-change event contract.
2. Shell-owned mobile/primary outcome labels are excluded from the legacy global translation mutator so React shell i18n and the legacy translator cannot race each other.
3. LanguageBootstrap stores the effective locale, not `auto`, in the runtime shell dataset.
4. Shared navigation links/buttons receive explicit physical minimum target dimensions.
5. The authenticated target-size check implements only the WCAG inline-text-link exception while remaining strict for non-inline targets.
6. Failed target-size evidence now includes bounded target examples to make any residual failure immediately diagnosable.
7. Arabic RTL and reviewed operational Arabic marker gates remain fail-closed.

No production deployment, secret handling, permission expansion, Safe Execute expansion, or consequential-action change is introduced.
