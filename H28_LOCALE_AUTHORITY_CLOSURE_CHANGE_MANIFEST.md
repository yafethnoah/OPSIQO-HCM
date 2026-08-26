# OPSIQO V7.32 H28 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Locale Authority + Rendered Route Closure

Base certified H27 SHA:
2d71198b6aefd1763ce2d128c603eafba5b0c329

## Live H27 evidence

H27 browser diagnostics proved:
- locale = ar;
- direction = rtl;
- directionMismatch = false;
- rendered localization gaps still existed;
- the same Nav instance rendered the protected outcome bar in Arabic while the unprotected sidebar body could be rewritten back to English;
- several route workspaces contained fully reviewed static strings but did not install a surface-local translation hook;
- more than one runtime path was allowed to write the global locale.

## H28 repair

1. One runtime locale authority in runtime-locale.ts.
2. User preference > stored preference > organization default > English.
3. Root pre-hydration bootstrap reads only the same canonical localStorage key; it performs no API call and does not become a second authority.
4. LanguageBootstrap is retained only as a no-op compatibility component and removed from RootLayout.
5. useShellLocale hydrates deterministically in English and synchronizes after mount, preventing locale-driven React text hydration mismatch.
6. The whole desktop Nav is marked React-i18n-owned, preventing the global MutationObserver from reverting shellText output.
7. AppShell similarly protects the command bar and mobile outcome navigation.
8. AppShell exposes a governed route translation host.
9. Reviewed route surfaces are inferred from the V7.32 catalog file metadata; surface-local reviewed translations are applied to route workspaces that never installed an explicit legacy hook.
10. Explicit nested surface hooks remain higher priority and are skipped by route fallback.
11. Global reviewed translation excludes route-owned surfaces to eliminate observer ownership fights.
12. Settings organization defaults and SuperApp preference saves now use the central locale authority.
13. Common setting/enum values observed in live Arabic UAT are added as exact runtime translations.
14. H28 audit rejects any independent applyRuntimeLocale writer under src/.

## Acceptance

Before production:
- no locale-driven React hydration failure;
- Arabic: rtl and rendered unexpected English = 0 on browser sweep;
- French/Spanish: rendered unexpected English = 0 on browser sweep;
- English: ltr;
- static translation backlog = 0;
- H27/H26/H25 regressions, full Vitest and production build pass;
- exact immutable SHA is certified and deployed to UAT before human signoff.

## H28C ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Grant Workforce direct reviewed surface

The H28 route-inference contract exposed a real reviewed-surface ownership gap:
/grant-workforce rendered GrantWorkforceWorkspace, but that component had no
direct entry in the V7.32 surface-local translation catalog. Static inventory
could still show zero backlog through exact global reuse, which is insufficient
for deterministic route-local ownership.

H28C adds a direct reviewed surface for
src/components/grant-workforce-workspace.tsx, keeps the H28 route test intact,
and hardens the architecture audit to require the direct FR/ES/AR surface.
## H28D ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Native React route localization ownership

After H28C fixed the real Grant Workforce catalog gap, the strengthened test
correctly moved to /translation-readiness. Source inspection showed that this
route is fundamentally different: TranslationReadinessWorkspace already renders
EN/FR/ES/AR directly in React through useShellLocale and a complete local
dictionary.

Creating another DOM-translation surface for this route would reintroduce the
same dual-ownership class that H28 is designed to eliminate.

H28D therefore establishes deterministic route ownership:

- native-react: React owns localized text and the route is excluded from the
  global DOM MutationObserver;
- reviewed-surface: the governed surface translator owns the route;
- none: certification failure.

/translation-readiness is native-react.
/grant-workforce remains reviewed-surface.

The route's server-supplied certification-boundary text is explicitly passed
through runtime translation before the native React route is isolated from the
global DOM translator.
## H28F Ã¢â‚¬â€ Organizational Memory reviewed-surface ownership

After the H28E audit-encoding repair passed, the targeted H28 route-ownership
contract identified /organizational-memory as the final live-UAT route with no
deterministic localization owner.

Source inspection confirms OrganizationalMemoryWorkspace is not a native
React-localized route and does not install an explicit legacy-surface hook.
H28F therefore gives it direct eviewed-surface ownership by binding the
V7.32 catalog to src/components/organizational-memory-workspace.tsx.

Static user-interface strings receive explicit FR/ES/AR translations.
Dynamic query/date labels use governed runtime translation templates.
Authoritative organization source titles/excerpts remain source content rather
than being fabricated or silently rewritten.
## H28G â€” Hydration contract regression alignment

The full Vitest suite exposed one obsolete H19 static-source assertion after all
H28 localization ownership tests passed.

H19 originally required useShellLocale() to initialize React state directly
from currentShellLocale(). H28 intentionally supersedes only that initial
render behavior: the shell now starts from deterministic English so server and
first client render agree, then synchronizes the bootstrapped locale after
mount. The H19 resilience mechanisms remain intact:

- locale-change event synchronization;
- direct document data-opsiqo-locale / lang / dir observation;
- MutationObserver updates.

H28G updates the regression test to enforce both contracts together rather than
reverting the hydration fix.
## H28H — Program Workforce exact local Worker translation

After H28G made the entire test suite and production build green, the translation
inventory correctly identified two remaining visible source candidates, both the
exact string Worker in ProgramWorkforceWorkspace.

Program Workforce already owns an explicit reviewed surface through
useLegacySurfaceTranslation('program_workforce', ...). H28H therefore resolves
the two candidates at that authoritative local surface instead of weakening the
inventory or relying on globally reused wording.

Explicit local translation:
- FR: Travailleur
- ES: Trabajador
- AR: الموظف

The H28 architecture audit now requires this local translation to remain present.