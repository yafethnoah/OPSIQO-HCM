# OPSIQO H48.7 — Payroll Period Integrity

Certified base
--------------
H48.6 SHA:
d398ff63c13c45ee1ac14dc134c53ffcb999f04c

Defects closed
--------------
1. Payroll export period was derived with JavaScript UTC conversion:
   new Date().toISOString().slice(0,10)
   This can advance the calendar date late in the evening in Ontario.

2. Payroll export used overlap semantics:
   weekEnd >= periodStart && weekStart <= periodEnd
   This can export a complete weekly timesheet even when that week extends outside
   the filename's declared payroll period.

H48.7 behavior
--------------
- HR explicitly selects Pay period start and Pay period end.
- Initial values come from the authoritative loaded timesheet week.
- Export dates remain calendar-date strings and are not derived by UTC conversion.
- Only APPROVED timesheets are eligible.
- A weekly timesheet must be fully contained inside the selected payroll period.
- Partial-week over-export is blocked.
- Export periods are limited to 1..366 calendar days.
- Payroll export run and audit evidence remain unchanged.
- CSV identity and hour columns remain unchanged.
- Payroll response is no-store.
- H48.6 admin override, H48.5 live attendance, H48.4 visibility,
  H48.3 time precision, H48.2 preflight, and H48.1 runtime behavior are regressed.

This patch does not commit, push, deploy UAT, or modify production.
