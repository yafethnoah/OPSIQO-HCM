# OPSIQO V7.32 Hotfix 13

## Trigger
Authenticated browser UAT could freeze indefinitely on a route because ordinary CDP commands were unbounded and HTTP status was checked by a second `fetch(location.href)` with `awaitPromise:true`.

## Repair
- Added a bounded timeout to every CDP command.
- Removed the second same-page fetch.
- Captures the top-level Document HTTP status from Chrome Network events.
- Records a route-runtime failure instead of hanging forever.
- Attempts `Page.stopLoading` and continues the route matrix after a bounded route failure.
- Preserves partial browser evidence in the existing JSON report.

## Boundary
This hotfix makes browser certification fail boundedly and diagnostically. It does not waive or suppress accessibility failures; actual failed checks remain release blockers until fixed or human-reviewed under the existing governance process.
