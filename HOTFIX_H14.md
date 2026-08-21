# OPSIQO V7.32 H14

## Purpose
Eliminate authenticated browser UAT freezes such as the repeated stall on route `/integrations`.

## Real repair
- Replaced the single long-lived browser matrix with one isolated Node worker and fresh browser process per route.
- Added an OS-level 12-second watchdog around every route worker.
- On Windows, timeout cleanup uses `taskkill /T /F` against only the timed-out worker process tree.
- Added a bounded 3-second HTTP route probe.
- Added a 3-second `WAIT ROUTE` heartbeat so a slow route never appears silently frozen.
- Checkpoints browser evidence after every completed route.
- A timed-out route is recorded as a failure and the matrix continues to the next route.
- Each route worker force-cleans its browser process tree and temporary browser profile.
- Preserved all accessibility checks and the non-conformance boundary; failures are not suppressed.

## Safety
The certification runner still performs no Firebase/App Hosting production deployment and does not print environment secret values.
