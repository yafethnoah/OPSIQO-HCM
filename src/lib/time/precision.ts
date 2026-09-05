const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_MINUTE = 60_000;
const MINUTE_PRECISION = 1_000_000;

export function normalizeMinutes(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, value) * MINUTE_PRECISION) / MINUTE_PRECISION;
}

export function exactMinutesBetween(startAt: string, endAt: string) {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return normalizeMinutes((end - start) / MILLISECONDS_PER_MINUTE);
}

export function exactWorkedMinutes(startAt: string, endAt: string, breakMinutes = 0) {
  return normalizeMinutes(exactMinutesBetween(startAt, endAt) - Math.max(0, breakMinutes));
}

export function sumMinutes(values: Array<number | null | undefined>) {
  return normalizeMinutes(values.reduce<number>((total, value) => total + (Number.isFinite(value) ? Number(value) : 0), 0));
}

export function decimalHoursFromMinutes(minutes = 0, decimals = 2) {
  return (normalizeMinutes(minutes) / MINUTES_PER_HOUR).toFixed(decimals);
}

export function formatDurationMinutes(minutes = 0) {
  const totalSeconds = Math.max(0, Math.round(normalizeMinutes(minutes) * SECONDS_PER_MINUTE));
  const hours = Math.floor(totalSeconds / 3600);
  const remaining = totalSeconds % 3600;
  const mins = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  if (hours > 0) return `${hours}h ${mins}m ${seconds}s`;
  if (mins > 0) return `${mins}m ${seconds}s`;
  return `${seconds}s`;
}

export function durationWithDecimalHours(minutes = 0) {
  return `${formatDurationMinutes(minutes)} · ${decimalHoursFromMinutes(minutes)}h`;
}
