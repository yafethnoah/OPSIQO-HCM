# OPSIQO V7.32 H27 Browser Runtime Localization Closure

Base certified H26 SHA: 7591b33b0c9c7a466b430f6f59d382f678a7dfa0

## Real UAT findings addressed

- Navigation items were stored in English and rendered with raw item.label inside a shell subtree that intentionally excludes global DOM translation.
- Organization Switcher rendered its label, state messages and membership role in English.
- Home contained raw English literals outside its locale dictionary.
- Translation Readiness had computed English badge/loading/footer text despite a zero static-source backlog.
- Runtime diagnostics incorrectly ignored English that remained visible whenever a translation existed in the catalog, masking application failures.
- Runtime diagnostics checked text nodes only and missed placeholders, titles and aria-labels.
- Live H26 UAT exposed dynamic/server-driven English on Compliance Radar, Skills Passport, Organizational Memory, Lifecycle and employee-service summaries.

## H27 design

1. Explicit shell localization for all governed navigation labels and controls.
2. Explicit Organization Switcher localization.
3. Direct localization of known Home and Translation Readiness computed strings.
4. Expanded reviewed FR/ES/AR runtime/template catalog for live-UAT dynamic strings.
5. Browser-truth diagnostics: visible English is reported even when a translation exists in the catalog.
6. Diagnostics also scan placeholder/title/aria-label/alt and expose a machine-readable result on window and document datasets.
7. Authoritative tenant data may use data-opsiqo-i18n-allow=true; this distinguishes stored business data from UI chrome.
8. Surface-local precedence and shell/global translation boundaries remain unchanged.

## Acceptance target after deployment

- Arabic: RTL and zero unexpected rendered-English residuals after allowlisted technical/authoritative data.
- French/Spanish: zero unexpected rendered-English residuals on the same routes.
- English: LTR and English source identity preserved.
- Static translation inventory remains zero backlog.
- Full historical regression/build/certification remains green.
