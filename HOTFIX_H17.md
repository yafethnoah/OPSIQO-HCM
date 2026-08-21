# OPSIQO V7.32 H17

## Trigger
H16 completed the full 69-route authenticated browser matrix without freezing, but the accessibility UAT gate failed with 196 checks. The certification ledger recorded 79 PASS gates and one FAIL gate: Authenticated emulator-backed accessibility UAT.

## Root causes
The evidence separated into two classes:

1. **UAT harness false positives / race conditions**
   - the DOM accessible-name helper ignored associated `<label>` elements and `aria-labelledby`, even when Chrome's accessibility tree already exposed valid names;
   - the Arabic shell check dispatched a bare Event and sampled after a single 120 ms delay, racing the application language bootstrap;
   - `/mfa/setup` was incorrectly expected to expose the normal five-outcome mobile shell even though it is intentionally a dedicated security route.

2. **Real UI/accessibility defects**
   - genuinely unnamed form controls in AI Governance, Recruiting, Employee Service Center, Grant Workforce, People, Time, Compliance, Career GPS, Organizational Memory, Import Center and AI surfaces;
   - small controls below the 24x24 CSS-pixel target floor;
   - mobile reflow weaknesses in shared cards/flex/grid containers;
   - integration translation roots detached after data load, increasing global translation work and contributing to the late `/integrations` locale-switch timeout;
   - Daily Brief presentation did not respond to the live shell locale.

## Repair
- Upgraded the authenticated UAT accessible-name calculation to honor `aria-label`, `aria-labelledby`, associated labels, labelled ancestors, image alt text and native input button values while retaining the Chrome Accessibility Tree assertion.
- Arabic locale testing now uses the same `CustomEvent('opsiqo:locale-changed', {detail:{locale:'ar'}})` contract as the application and performs bounded retry/polling.
- `/mfa/setup` is treated as a security-shell route: it must remain authenticated, accessible, RTL-capable and operationally translated, but it is not falsely required to render the normal outcome navigation.
- The application shell locale hook now consumes the explicit locale event detail deterministically.
- Restored the governed translation root on the loaded Integration Command Center and Integration Runtime trees.
- Daily Brief now follows the live shell locale.
- Added explicit accessible names to the browser-confirmed unnamed controls across the affected workspaces.
- Added 24px minimum target sizing for form/button controls and mobile target support for standalone card/row links.
- Added shared min-width/max-width/overflow-wrap mobile reflow hardening without hiding document overflow.
- Added H17 audit and targeted-test gates to the canonical Windows runner.

## Safety / governance
- No Firebase project, deployment, App Hosting setting, Firestore data, secret, credential or production resource is changed.
- The H17 browser audit remains fail-closed.
- Chrome Accessibility Tree checks remain mandatory.
- Operational Arabic markers remain mandatory.
- Normal authenticated routes still require five mobile outcome links.
- This smoke test remains browser-backed evidence, not a WCAG 2.2 AA conformance claim.
