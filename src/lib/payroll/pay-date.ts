import type {
  PayrollPayDateRule,
  PayrollPayDateSource,
  PayrollRun,
  PayrollWeekendAdjustment,
  PayrollWorkerProfile,
} from '@/domain/payroll';

type PayDateRun = Pick<PayrollRun, 'payDate' | 'workerPayDates'>;
type PayDateProfile = Pick<
  PayrollWorkerProfile,
  'payDateRule' | 'payDateOffsetDays' | 'payDayOfMonth' | 'weekendAdjustment'
>;

const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(date: string) {
  if (!DATE_RX.test(date)) throw new Error(`Invalid payroll date: ${date}`);
}

function shiftDate(date: string, days: number) {
  assertDate(date);
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fixedDayOfMonth(date: string, requestedDay: number) {
  assertDate(date);
  const d = new Date(`${date}T12:00:00Z`);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
  const day = Math.min(Math.max(Math.trunc(requestedDay), 1), lastDay);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function applyWeekendAdjustment(date: string, rule: PayrollWeekendAdjustment) {
  if (rule === 'none') return date;
  const d = new Date(`${date}T12:00:00Z`);
  const day = d.getUTCDay();

  if (rule === 'previous_weekday') {
    if (day === 6) return shiftDate(date, -1);
    if (day === 0) return shiftDate(date, -2);
  }

  if (rule === 'next_weekday') {
    if (day === 6) return shiftDate(date, 2);
    if (day === 0) return shiftDate(date, 1);
  }

  return date;
}

function inferredRule(profile: PayDateProfile | undefined): PayrollPayDateRule {
  if (profile?.payDateRule) return profile.payDateRule;
  if (profile?.payDayOfMonth) return 'fixed_day_of_month';
  if (Number(profile?.payDateOffsetDays || 0) !== 0) return 'offset_days';
  return 'run_default';
}

export function resolveWorkerPayDate(
  run: PayDateRun,
  profile: PayDateProfile | undefined,
  workerId: string,
): { payDate: string; source: PayrollPayDateSource } {
  const exactOverride = run.workerPayDates?.[workerId];
  if (exactOverride) {
    assertDate(exactOverride);
    return { payDate: exactOverride, source: 'worker_override' };
  }

  const rule = inferredRule(profile);
  const weekendAdjustment: PayrollWeekendAdjustment = profile?.weekendAdjustment || 'none';

  let candidate = run.payDate;

  if (rule === 'offset_days') {
    candidate = shiftDate(run.payDate, Number(profile?.payDateOffsetDays || 0));
  }

  if (rule === 'fixed_day_of_month') {
    const payDay = Number(profile?.payDayOfMonth || 0);
    if (!Number.isInteger(payDay) || payDay < 1 || payDay > 31) {
      throw new Error('Fixed day-of-month payroll rule requires a day from 1 to 31.');
    }
    candidate = fixedDayOfMonth(run.payDate, payDay);
  }

  const adjusted = applyWeekendAdjustment(candidate, weekendAdjustment);
  const source: PayrollPayDateSource =
    rule !== 'run_default' || weekendAdjustment !== 'none' ? 'profile_rule' : 'run_default';

  return { payDate: adjusted, source };
}

export function describeWorkerPayDateRule(profile: PayDateProfile | undefined) {
  const rule = inferredRule(profile);
  const weekendAdjustment = profile?.weekendAdjustment || 'none';

  let baseText = 'Uses run default release date';

  if (rule === 'offset_days') {
    const offset = Number(profile?.payDateOffsetDays || 0);
    baseText =
      offset === 0
        ? 'same day as run default'
        : offset > 0
          ? `${offset} day${offset === 1 ? '' : 's'} after run default`
          : `${Math.abs(offset)} day${Math.abs(offset) === 1 ? '' : 's'} before run default`;
  }

  if (rule === 'fixed_day_of_month') {
    baseText =
      Number(profile?.payDayOfMonth) === 31
        ? 'last calendar day of the run month'
        : `day ${Number(profile?.payDayOfMonth)} of the run month`;
  }

  const weekendText =
    weekendAdjustment === 'none'
      ? ''
      : weekendAdjustment === 'previous_weekday'
        ? '; move weekend releases to previous weekday'
        : '; move weekend releases to next weekday';

  return `${baseText}${weekendText}`;
}
