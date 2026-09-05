# OPSIQO H48.3 — Time Precision & Payroll Integrity

## Purpose
H48.3 corrects the timing defect observed during real UAT on `https://uat.opsiqo.ca/time` where each completed attendance entry was rounded to a whole minute before weekly totals were calculated.

## Defect
The previous implementation calculated elapsed minutes with whole-minute rounding. This caused short entries to disappear from totals and caused multi-entry totals to drift. In the observed UAT case, a 29-second entry plus a 13m21s entry should total 13m50s (0.23h), but the old engine produced 13 minutes (0.22h).

## H48.3 controls
- Raw clock evidence remains the authoritative `startAt` / `endAt` timestamp pair.
- Clock-out and manual-entry derived `workedMinutes` preserve sub-minute precision.
- Existing completed entries are recalculated from timestamps when building timecards, timesheets, and compliance totals, so legacy whole-minute cached values do not continue to distort UAT totals.
- UI shows human-readable actual duration to seconds plus decimal hours.
- New time policies default to `roundingMinutes: 0` rather than silently hard-coding 15 minutes.
- The rounding field is visible to HR and is explicitly not applied to raw attendance evidence or H48.3 timesheet totals.
- Payroll export continues to round only the final hours representation to two decimal places; the underlying timesheet total is precise.

## Governance boundary
H48.3 does not silently introduce payable-time rounding. A non-zero `roundingMinutes` value remains a governed policy setting, but raw attendance evidence and H48.3 actual-time totals are never mutated by it. Any future payable-time rounding engine must be separately designed, disclosed, tested, and approved.
