# OPSIQO H51.70 — Attendance Alarm Reliability + Admin Actions

Parent: H51.69 `f687f1703d8b31bb853c93b5de66d189ec372f63`

## Real Clock In / Clock Out alarm reliability

The H51.69 one-minute timing test used a different notification kind from the
managed Clock In/Clock Out schedule. Managed attendance alarms were synchronized
whenever Pulse bootstrapped or returned to the foreground.

H51.70 now:
- keeps an already-armed reminder when its exact schedule is still desired;
- creates only missing reminders;
- cancels only obsolete reminders after desired state is known;
- preserves a due reminder for a short grace period if the OS has not delivered
  it yet and authoritative attendance state still says the employee has not acted;
- cancels Clock In/Clock Out reminders once attendance state shows the employee
  has clocked in/out;
- displays separate Clock In and Clock Out armed times, last sync time, and a
  manual Re-arm action.

## Administration attendance broadcast

Authorized HR administrators can send an audited high-priority Clock In or Clock
Out reminder to:
- all active staff;
- staff not currently clocked in;
- staff currently clocked in.

Staff on approved leave today are excluded by default. Push is sent to valid
registered devices and an in-app notification is created for active memberships.
The action never creates or changes a time entry.

## Administration leave on behalf

HR administrators with leave-management permission can record leave for an
employee when the employee cannot submit personally:
- partial-day/time leave using requested hours;
- full scheduled day(s) by leaving hours blank;
- submit into the normal approval workflow;
- optionally approve immediately when the administrator also has leave-approval
  permission.

Admin reason and on-behalf provenance are retained in the leave record and audit
trail. The administrator on-behalf path cannot be used for the administrator's
own worker record.

## Mobile operating-system boundary

OPSIQO requests notification sound and high-priority delivery, but iOS and Android
retain final control over notification permission, Focus / Do Not Disturb, silent
mode and battery policies. H51.70 improves OPSIQO scheduling reliability but does
not claim to bypass operating-system controls.
