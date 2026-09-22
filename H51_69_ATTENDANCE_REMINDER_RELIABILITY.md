# OPSIQO H51.69 — Attendance Reminder Reliability

Parent: H51.68 `1163acb5992b4513a993b18780102531a339aaf9`

## Hybrid reminder architecture

1. Existing Pulse local alarms remain the first layer and are scheduled from the employee's published shift or regular-schedule fallback.
2. Pulse now automatically registers an Expo push token after authenticated bootstrap/notification permission.
3. Server backup reminders use published OPSIQO shifts:
   - Clock In due at shift start when no clock-in exists.
   - Clock In missed follow-up 5 minutes later when still not clocked in.
   - Clock Out due at shift end while an open time entry exists.
   - Clock Out missed follow-up 10 minutes later while still clocked in.
4. A deterministic attendanceReminderDeliveries record prevents duplicate server reminders.
5. In-app notification fallback is created even when no valid push device is available.
6. Pulse exposes local-alarm and server-backup readiness.
7. The dedicated protected endpoint /api/system/attendance-reminders is designed for a one-minute Cloud Scheduler cadence using OPSIQO_JOB_SECRET.
8. The normal OPSIQO automation cycle also runs the reminder processor as defense in depth.

## Boundaries

- Server backup reminders use authoritative published OPSIQO shifts. The local regular-schedule fallback remains device-local.
- Reminder delivery does not alter attendance records.
- No background location is introduced.
- A push notification is a reminder, not proof that a worker received/read it.
- This source release does not create the external Cloud Scheduler job and does not deploy UAT or Production.

## Inherited H50.2B regression migration

H50.2B asserted the exact Promise.all tuple used by mobileBootstrap. H51.69
keeps the same parallel bootstrap behavior and adds `reminderDevices` to that
same Promise.all so Pulse can report whether server backup push is ready.

The inherited regression now checks the extended parallel tuple plus
`attendanceReminderReliability`. No H50.2B behavior was removed or serialized.