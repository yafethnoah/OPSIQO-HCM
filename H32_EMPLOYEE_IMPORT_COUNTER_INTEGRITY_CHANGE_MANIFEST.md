# OPSIQO V7.32 H32 — Employee Import Counter Integrity

## UAT finding

H31 correctly revalidated employee rows and could transition an individual row
to Ready, but live UAT evidence showed a row marked Ready while the summary
badges still displayed 0 Ready / 6 Need Review.

## Repair

The employee import client now derives its operational summary directly from
the returned row validation state:

- Ready = rows with zero validation errors.
- Need Review = total rows minus Ready.
- The final import button uses the same derived row-state counts.
- The import button label uses the same derived row-state counts.
- The client detects when server-provided summary counters disagree with the
  returned row validation state and displays a synchronization notice.

## Governance

This is defense in depth, not a weakening of backend authority.

The backend remains authoritative and still blocks commit when its persisted
preview has blockers. H31 revalidation, audit logging, capacity validation,
duplicate checks, manager validation, and governed organization-unit
reconciliation are unchanged.

## Acceptance criteria

For a six-row preview:

- Correct one row -> 1 Ready / 5 Need Review.
- Correct another row -> 2 Ready / 4 Need Review.
- Counts must always equal the displayed row states.
- Final import remains disabled until 0 Need Review.
- At 6 Ready / 0 Need Review, the final import button becomes eligible.
- Server-side commit protection remains unchanged.

## Deployment boundary

H32 must pass full regression and canonical release proof before UAT rollout.
Production remains untouched.