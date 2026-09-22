# OPSIQO H51.74 — Statutory Leave Compliance Engine

Parent: H51.73 `72c818db79e2330eb253aa06ed5ffcb7e583a3b6`

## Purpose
H51.74 converts leave-type setup from a generic label/pay checkbox into a jurisdiction-aware, source-backed leave compliance workflow while preserving H51.73 notification and native alarm fixes.

## Ontario statutory leave intelligence
- Adds a governed Ontario statutory leave template registry using official Ontario sources observed 2026-09-22.
- Separates employer-paid statutory amounts, unpaid statutory amounts, mixed paid/unpaid treatment, vacation pay, and external income-replacement concepts.
- Registers active, conditional-inactive, and future-not-in-force legal states.
- Keeps placement-of-child leave out of automatic activation until the Ontario provision is in force.
- Keeps declared-emergency leave out of automatic activation while no qualifying declared emergency is in effect.
- Preserves greater employer/contract/collective-agreement benefits through explicit enhancement fields.

## HR workflow
- Adds **Configure Ontario statutory leaves** to bulk-create missing active Ontario statutory leave types.
- Adds statutory-vs-employer-policy source selection to the inline **+ New leave type** workflow.
- Displays entitlement, employer-paid portion, unpaid portion, eligibility, evidence, consumption rules, external-benefit note, source and observation date before creation.
- Statutory legal facts are normalized server-side instead of trusting client checkboxes.
- Duplicate leave codes are blocked.
- Existing generic H51.73 starter labels remain available for employer/custom policies.

## Safety / governance
- No statutory leave is activated from a future or conditionally inactive rule.
- Mixed paid/unpaid statutory leave is not simplified to a single `paid=true` flag.
- Legal-source metadata is stored with each statutory leave type.
- Statutory templates remain decision support and require case review where applicability depends on employee circumstances.
- Production is untouched until exact-SHA UAT is completed.
