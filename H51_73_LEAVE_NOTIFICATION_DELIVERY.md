# OPSIQO H51.73 — Leave Type + Staff Notification Delivery Closure

Parent: H51.72 `31efcac2482b3b3bed7f17d79e3a604de4ede855`

## Leave administration
- Keeps configured leave types as the organization source of truth.
- Adds an inline **+ New leave type** action in the administrator employee-leave workflow.
- Provides common starter labels: Vacation, Sick, Personal, Bereavement, Family/Caregiver, Unpaid, Jury/Civic and Other.
- Supports a custom leave type.
- Newly created leave type is selected automatically so the administrator can finish the same leave transaction.
- Starter labels do not infer statutory status, job protection, pay status, accrual or legal entitlement.

## Staff notification delivery
- Preserves H51.72 local exact-alarm scheduling and iOS Time Sensitive notification behavior.
- Explicitly binds server attendance pushes to the Android attendance notification channel.
- Creates the Android attendance channel before direct device registration requests notification permission.
- Refreshes push registration when Pulse enters the authenticated app and when it returns to foreground.
- Surfaces missing EAS push configuration rather than silently storing a non-push-ready registration.
- Adds **Repair & test server notifications** to Pulse Time.
- Adds an authenticated server-to-device self-test endpoint.
- Admin attendance broadcast feedback distinguishes no push-ready device, zero provider acceptance, partial provider acceptance and full provider acceptance.

## Release discipline
H51.72 is the current exact-SHA web UAT baseline. H51.73 is the next controlled source release. Freeze and push H51.73 first, then deploy its exact SHA to web UAT. A fresh native Pulse binary is required to validate the H51.72/H51.73 native notification changes. Production remains untouched.
