# OPSIQO H51.58 â€” Pulse Persistent Session + Attendance Closure

Parent: H51.57 `680321fab39951a8fa49678f7949510f11bc4041`

Certified Pulse donor: H50.2B `2dd7df6940d78b7b952de946f3f081012bd7f6d0`

## Root causes closed

1. H51.57 carried the older H48.1 mobile tree rather than the certified Pulse H50.2B mobile tree.
2. H51.57 `/mobile/bootstrap` used `actorFromRequest()`, so organization `auth_time` session timeout could expire Pulse even when Firebase refresh credentials remained valid.
3. H51.57 did not contain the H50.2B mobile-only clock/break/leave/expense routes. The installed Pulse 1.0.2 client therefore could receive HTTP 404 from valid mobile self-service actions.
4. H51.57 mobile bootstrap did not include H50.2B deterministic worker recovery, self-attendance isolation, parallel bootstrap, or worker-bound clock capability.
5. The older mobile client did not contain the H50.2B persistent-session, App Check, one-time 401 refresh, transport-error, and last-good bootstrap behavior.

## H51.58 behavior

- Pulse session persists until explicit sign-out, Firebase revocation, disabled/deleted account, or invalid refresh credentials.
- Normal Firebase ID-token rotation occurs silently.
- A server 401 is retried once with the appropriate refreshed token.
- Temporary network failure does not delete the saved sign-in.
- Pulse bypasses the organization `auth_time` session timeout while web/admin APIs retain H51.57 policy behavior.
- Mobile self-service runs through employee-scoped permissions even when the same account also has a privileged web role.
- Worker linkage can be recovered only from explicit UIDâ†’Personâ†’Worker evidence or a unique verified-email worker match.
- Clock In, Clock Out, Break, Leave and Expense actions use dedicated mobile endpoints.
- Web/admin attendance endpoints remain separate.
- Attendance bootstrap is filtered to the active employee.
- Production is not modified by this repair script.