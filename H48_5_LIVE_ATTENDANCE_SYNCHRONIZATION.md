# OPSIQO H48.5 — Live Attendance Synchronization

## Defect closed
H48.4 correctly produced Who’s In Now and Attendance Activity data, but the frontend refreshed those views on a 60-second timer. A successful clock-in could therefore remain invisible until the next polling cycle even though the Timecard had already changed.

## H48.5 behavior
- Successful clock-in and clock-out publish a shared `opsiqo:attendance-changed` browser event.
- Successful manual attendance corrections publish the same event.
- Successful offline attendance reconciliation publishes the same event after server synchronization.
- Break start/end publishes the same event.
- Who’s In Now and Attendance Activity Log reload together immediately when the event fires.
- Live attendance refreshes when the browser window regains focus or the tab becomes visible.
- A 15-second poll remains as a safety fallback rather than the former 60-second stale-state window.
- Live attendance and attendance-activity GET responses explicitly use `Cache-Control: no-store` and disable CDN caching.
- Existing employee visibility/permission and location-privacy boundaries remain unchanged.

## Acceptance
1. Clock in succeeds.
2. Who’s In Now shows that worker without manual refresh or waiting for the fallback poll.
3. Attendance Activity Log shows the clock-in event in the same refresh cycle.
4. Clock out succeeds.
5. Who’s In Now removes/changes that worker immediately.
6. Attendance Activity Log shows the clock-out event immediately.
7. Break start/end follows the same immediate synchronization behavior.
8. Refresh/focus/visibility fallback remains functional.
