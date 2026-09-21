# OPSIQO H51.66 - Onboarding Pre-Activation UX

Parent: H51.65 `7ee8f89d2aec6a42e5d024c8e8f1c24e0f00cf3e`

## Purpose

Make the H51.65 pre-activation correction workflow obvious, trustworthy and hard
to misuse.

## UX changes

- Replaces the easy-to-miss collapsed edit accordion with a visible `Edit details`
  action in the case header.
- Adds an always-visible Pre-activation details summary showing:
  - work email
  - employment type
  - accepted start date
  - employee-number state
- Explains that shared departmental work email is permitted and is not worker or
  login identity.
- Opens a dedicated edit panel with explicit Save and Cancel controls.
- Requires the administrator to type a genuine change reason; no synthetic audit
  reason is pre-filled.
- Keeps the accepted-offer start date read-only in this correction panel.
- Keeps employee-number uniqueness and activation assignment authority intact.
- Uses worker-type-aware activation labels such as `Activate contractor`.
- Preserves all completed onboarding tasks, documents and 6/6 readiness.

## Scope

This is a UX continuation of H51.65. The certified H51.65 shared-email identity
model and audited `update_details` backend contract are preserved unchanged.

No UAT or Production deployment is performed by this source package.
## Inherited regression contract migration

The inherited H51.65 UI regression asserted the exact button copy
`Save pre-activation details`. H51.66 intentionally replaces that label with
the clearer `Save changes` action inside a dedicated visible edit panel.

The regression now verifies the current visible action and the always-visible
Pre-activation details section while retaining the H51.65 backend assertions for
`update_details`, audit evidence, shared-email handling and readiness
preservation.

No backend control was weakened to make the test pass.