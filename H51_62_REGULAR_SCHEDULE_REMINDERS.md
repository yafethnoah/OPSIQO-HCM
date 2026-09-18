# OPSIQO H51.62 - Regular Schedule Attendance Reminders

Parent: H51.61 `36fb9d8506bc5f77070b2e057836cc784c0275c9`

H51.62 closes the confirmed zero-shift reminder gap in OPSIQO Pulse.

The iPhone notification system and immediate test notification are already working.
The missing behavior occurs because the automatic scheduler has no start/end times
when the employee has zero published shifts.

## Fixes
- Published shifts remain the highest-priority reminder source.
- Draft/cancelled shifts are not used for attendance reminders.
- Adds an employee regular-schedule fallback for days with no published shift.
- Lets the employee select workdays and normal start/end times.
- Published shifts override the fallback on matching days.
- Shows schedule source, scheduled alarm count, and next alarm time.
- Adds a one-minute delayed timing test using the same DATE trigger as real reminders.
- Passes live attendance state into manual scheduling.
- Migrates existing v2 alarm preferences into v3.
- Preserves foreground-only location privacy.
- Does not change Expo/native dependencies or runtime version.

## Deliberate boundary
H51.62 does not invent work hours. The employee must configure the regular fallback
times when the organization has not published shifts.
