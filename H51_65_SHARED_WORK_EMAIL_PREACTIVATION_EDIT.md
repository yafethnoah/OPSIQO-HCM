# OPSIQO H51.65 - Shared Work Email + Pre-Activation Edit

Parent: H51.64 `29340157f05c91110cf07a41621f03603be52b02`

H51.65 permits intentional shared departmental work mailboxes to be attached to
multiple workers without using the mailbox as worker identity.

Identity remains authoritative through unique employee number plus explicit
Firebase UID / organization membership / membership.workerId linkage.

Pulse email recovery remains safe: an email fallback is accepted only when
exactly one worker matches the verified email. A shared mailbox therefore never
silently selects a worker.

The existing one-worker workEmailIndex is migrated lazily to a compatibility
multi-owner index (`workerIds`, `shared`). Recruiting hire conversion is
idempotent by application/hireConversionIndex and no longer deduplicates a
person by work email.

Authorized HR users can also edit an open onboarding case before activation:
- Work email
- Employment type
- Change reason

The edit is audited and emits an onboarding domain event. Existing tasks,
documents, malware-scan evidence, profile data and 6/6 Ready for Activation
state are preserved.

No UAT or Production deployment is performed by this source continuation.
## Regression contract migration

Two historical source-contract tests asserted the retired one-work-email /
one-worker implementation. H51.65 updates those assertions to preserve the
original safety goals while recognizing the new governed model:

- work email remains optional and valid-email checked when supplied;
- a supplied work email is indexed through the multi-owner workEmailIndex;
- employee number uniqueness remains enforced;
- work email is no longer a unique worker identity;
- explicit membership / workerId remains the authentication identity authority.

No production behavior is weakened to satisfy the old tests.