# OPSIQO H48.4 — Attendance Visibility & Timestamp Consistency

H48.4 closes the final Time & Attendance UAT presentation/visibility gaps observed after H48.3.

## Closure scope

- Normalizes attendance start/end timestamps to whole-second evidence boundaries before elapsed-time calculations so visible endpoints and visible duration reconcile exactly.
- Preserves the authoritative stored timestamp evidence while preventing hidden milliseconds from producing a one-second display mismatch.
- Keeps legacy completed entries recalculated from authoritative timestamps through the H48.3 precision pipeline.
- Removes whole-minute rounding from explicit break duration; unpaid break accumulation now retains second precision.
- Upgrades the existing live-attendance surface into **Who’s In Now** with employee name/number, current status, clock-in time, live elapsed time, source/device, governed location state, last activity and integrity signal.
- Adds a permission-scoped **Attendance Activity Log** for clock-in, clock-out and audited manual attendance activity.
- Adds an API route at `/api/organizations/[orgId]/time/attendance-activity`, protected by `time.read` and worker-scope authorization.
- Links recent visible activity to OPSIQO audit references without exposing credential or secret material.
- Keeps location collection policy-bounded; when no location evidence exists, the UI explicitly states `Not collected`.
- Retains the privacy boundary that OPSIQO does not continuously track employees outside attendance events.

## UAT acceptance

1. Existing H48.3 entry `7:45:19 PM → 7:58:40 PM` must display a duration consistent with the same whole-second endpoints (`13m 21s` for those endpoints).
2. HR/Admin/Manager sees **Who’s In Now** only for workers within their permitted scope.
3. Clocked-in rows show employee identity, state, start time and live elapsed duration.
4. Recent clock-in and clock-out events appear in **Attendance Activity Log** with employee identity, timestamp, source and audit reference.
5. A policy that does not collect location displays `Not collected`; no location permission is requested merely to view attendance.
6. H48.3, H48.2 and H48.1 regression gates remain green.

Production is not modified by the H48.4 patch/validation package.
