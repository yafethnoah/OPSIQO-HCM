import { describe, expect, it } from 'vitest';
import {
  decimalHoursFromMinutes,
  durationWithDecimalHours,
  exactMinutesBetween,
  exactWorkedMinutes,
  formatDurationMinutes,
  sumMinutes,
} from '@/lib/time/precision';

describe('H48.3 time precision and payroll-integrity math', () => {
  it('preserves a sub-minute completed punch instead of rounding it to zero', () => {
    const minutes=exactWorkedMinutes('2026-09-04T23:42:42.000Z','2026-09-04T23:43:11.000Z',0);
    expect(minutes).toBeCloseTo(29/60,6);
    expect(formatDurationMinutes(minutes)).toBe('29s');
  });

  it('preserves exact seconds on a multi-minute punch', () => {
    const minutes=exactWorkedMinutes('2026-09-04T23:45:19.000Z','2026-09-04T23:58:40.000Z',0);
    expect(minutes).toBeCloseTo(13+21/60,6);
    expect(formatDurationMinutes(minutes)).toBe('13m 21s');
  });

  it('produces the expected combined UAT total of 13m50s and 0.23h', () => {
    const first=exactWorkedMinutes('2026-09-04T23:42:42.000Z','2026-09-04T23:43:11.000Z',0);
    const second=exactWorkedMinutes('2026-09-04T23:45:19.000Z','2026-09-04T23:58:40.000Z',0);
    const total=sumMinutes([first,second]);
    expect(formatDurationMinutes(total)).toBe('13m 50s');
    expect(decimalHoursFromMinutes(total)).toBe('0.23');
    expect(durationWithDecimalHours(total)).toBe('13m 50s · 0.23h');
  });

  it('subtracts break minutes without destroying second precision', () => {
    const minutes=exactWorkedMinutes('2026-09-04T12:00:00.000Z','2026-09-04T13:00:30.000Z',15);
    expect(minutes).toBeCloseTo(45.5,6);
    expect(formatDurationMinutes(minutes)).toBe('45m 30s');
  });

  it('keeps timestamp interval precision for compliance calculations', () => {
    const minutes=exactMinutesBetween('2026-09-04T10:00:00.000Z','2026-09-04T10:00:29.000Z');
    expect(minutes).toBeCloseTo(29/60,6);
  });
});
