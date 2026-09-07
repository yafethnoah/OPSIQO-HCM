import { describe, expect, it } from 'vitest';
import type { TimeEntry } from '../src/domain/time';
import {
  attendanceLocationStatusFromTimeEntry,
  attendanceStatusHasCoordinates,
  buildAttendanceLocationStatus,
} from '../src/lib/time/attendance-map';

describe('H50 attendance location map', () => {
  it('builds clock-in location projection from governed attendance evidence', () => {
    const status = buildAttendanceLocationStatus({
      workerId: 'worker-1',
      event: 'clock_in',
      eventAt: '2026-09-07T12:00:00Z',
      evidence: {
        latitude: 43.589,
        longitude: -79.644,
        accuracyMeters: 12,
        capturedAt: '2026-09-07T12:00:00Z',
        source: 'browser',
        insideGeofence: true,
        deviceVerification: 'none',
      },
      updatedAt: '2026-09-07T12:00:01Z',
    });

    expect(status.lastEvent).toBe('clock_in');
    expect(status.hasLocation).toBe(true);
    expect(attendanceStatusHasCoordinates(status)).toBe(true);
  });

  it('does not invent a location when the active clock event has no location evidence', () => {
    const status = buildAttendanceLocationStatus({
      workerId: 'worker-1',
      event: 'clock_out',
      eventAt: '2026-09-07T20:00:00Z',
      updatedAt: '2026-09-07T20:00:01Z',
    });

    expect(status.hasLocation).toBe(false);
    expect(status.latitude).toBeUndefined();
    expect(status.longitude).toBeUndefined();
  });

  it('uses clock-out evidence as the latest location for a completed time entry', () => {
    const entry: TimeEntry = {
      id: 'entry-1',
      workerId: 'worker-1',
      startAt: '2026-09-07T12:00:00Z',
      endAt: '2026-09-07T20:00:00Z',
      breakMinutes: 30,
      workedMinutes: 450,
      source: 'web_clock',
      status: 'complete',
      startEvidence: {
        latitude: 43.58,
        longitude: -79.64,
        capturedAt: '2026-09-07T12:00:00Z',
        source: 'browser',
      },
      endEvidence: {
        latitude: 43.59,
        longitude: -79.65,
        capturedAt: '2026-09-07T20:00:00Z',
        source: 'browser',
      },
      createdBy: 'user-1',
      createdAt: '2026-09-07T12:00:01Z',
      updatedAt: '2026-09-07T20:00:01Z',
    };

    const status = attendanceLocationStatusFromTimeEntry(entry);

    expect(status.lastEvent).toBe('clock_out');
    expect(status.latitude).toBe(43.59);
    expect(status.longitude).toBe(-79.65);
  });

  it('rejects invalid coordinates rather than plotting corrupted evidence', () => {
    expect(() =>
      buildAttendanceLocationStatus({
        workerId: 'worker-1',
        event: 'clock_in',
        eventAt: '2026-09-07T12:00:00Z',
        evidence: {
          latitude: 120,
          longitude: -79.64,
          capturedAt: '2026-09-07T12:00:00Z',
          source: 'browser',
        },
        updatedAt: '2026-09-07T12:00:01Z',
      }),
    ).toThrow(/coordinates are invalid/i);
  });
});
