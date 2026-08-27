# OPSIQO V7.32 H33 — Inline Import Master-Data Creation

## Purpose
Allow HR reviewers to resolve missing organizational units and positions without leaving the employee parsing/review page.

## Workflow
- Existing authoritative values remain selectable first.
- Parsed source values are displayed.
- Possible existing matches are suggested to reduce duplicates.
- Reviewer may explicitly open an inline creation form.
- Organizational-unit form supports name, code, type and optional parent.
- Position form supports title, code, headcount capacity and FTE within the selected organizational unit.
- Successful creation automatically selects the new record and immediately revalidates the employee row.
- Nothing is created automatically.

## Governance
Existing standard HR APIs remain authoritative:
- organization creation requires organization.manage
- position creation requires positions.manage
- H31 validation idempotence remains unchanged
- H32 row-derived Ready / Need Review gate remains unchanged
- final employee import remains server blocked until all persisted rows validate