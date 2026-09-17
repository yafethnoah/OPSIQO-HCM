# OPSIQO H51.59 â€” Automatic Attendance Reminder Intelligence

Parent: H51.58 cce78929c0e6d2728dab342a1b3abccce1750466

Implemented:
- Automatic reminder synchronization after authenticated mobile bootstrap.
- Automatic reminder resynchronization when Pulse returns to the foreground.
- Automatic resynchronization when assigned shifts or live attendance state changes.
- Clock In reminders are suppressed after the worker is clocked in.
- Clock Out reminders are suppressed while the worker is not clocked in.
- Managed stale reminders are cancelled before each authoritative rebuild.
- Immediate "Send test notification now" control.
- Direct device notification-settings recovery after permission denial.
- Truthful no-shift status instead of implying an alarm exists.
- Existing custom Pulse/Chime/Bell sounds preserved.
- Background location remains disabled.

Scheduling authority:
Assigned OPSIQO shifts remain the authoritative source for Clock In and Clock Out alarm times.