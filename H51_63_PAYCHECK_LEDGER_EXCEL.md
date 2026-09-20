# OPSIQO H51.63 - Paycheck Due / Paid Ledger + Excel Export

Parent: H51.62 `b338305c63d587b11aaee4eddf9e453df4fcea79`

## Purpose

Add persistent paycheck tracking to Payroll and authorized Compensation views so
finance/HR can see when each calculated employee paycheck is due, identify
upcoming/due/overdue items, mark a payment as Paid, and export the filtered
paycheck register as an Excel-compatible workbook.

## Authority and governance

- Paycheck due date comes from the existing authoritative payroll worker pay-date
  resolution already frozen into payroll input/calculation evidence.
- H51.63 does not introduce a second editable pay-date authority.
- Paid state is persisted under the organization in `paycheckPayments`.
- Mark Paid requires `payroll.reconcile`.
- Excel export requires `payroll.export`.
- Mark Paid is available only after the payroll run has reached exported,
  reconciled or completed state.
- Every paid action creates an audit record with actor, timestamp, run, worker,
  due date, net amount and currency.
- Existing payroll calculations are not mutated.

## User experience

Each paycheck row exposes employee, position/org unit, payroll period, due date,
status, gross, deductions, net, run status and paid details.

Computed statuses: Upcoming, Due Today, Overdue, Paid.

Filters: Status, Due from, Due to.

Export filename: `OPSIQO_Paychecks_<from>_to_<to>.xls`

The workbook contains Paychecks and Summary worksheets and uses SpreadsheetML,
which opens directly in Microsoft Excel without adding a new runtime dependency.

## Production

No deployment is performed by this source package.
