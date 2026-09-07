import type {
  ClockLocationEvidence,
  TimeEntry,
} from '@/domain/time';

export type AttendanceMapClockEvent = 'clock_in' | 'clock_out';

export interface AttendanceLocationStatus {
  workerId: string;
  lastEvent: AttendanceMapClockEvent;
  lastEventAt: string;
  hasLocation: boolean;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  capturedAt?: string;
  source?: ClockLocationEvidence['source'];
  locationId?: string;
  insideGeofence?: boolean;
  deviceVerification?: ClockLocationEvidence['deviceVerification'];
  integrityRisk?: ClockLocationEvidence['integrityRisk'];
  updatedAt: string;
}

export function buildAttendanceLocationStatus(input: {
  workerId: string;
  event: AttendanceMapClockEvent;
  eventAt: string;
  evidence?: ClockLocationEvidence;
  updatedAt: string;
}): AttendanceLocationStatus {
  if (!input.workerId.trim()) {
    throw new Error('workerId is required for attendance map status');
  }

  if (!input.eventAt.trim() || !input.updatedAt.trim()) {
    throw new Error('attendance map event timestamps are required');
  }

  const evidence = input.evidence;

  if (evidence) {
    validateCoordinates(evidence.latitude, evidence.longitude);

    if (
      evidence.accuracyMeters !== undefined &&
      (!Number.isFinite(evidence.accuracyMeters) ||
        evidence.accuracyMeters < 0)
    ) {
      throw new Error('attendance location accuracy must be non-negative');
    }
  }

  return {
    workerId: input.workerId,
    lastEvent: input.event,
    lastEventAt: input.eventAt,
    hasLocation: Boolean(evidence),
    latitude: evidence?.latitude,
    longitude: evidence?.longitude,
    accuracyMeters: evidence?.accuracyMeters,
    capturedAt: evidence?.capturedAt,
    source: evidence?.source,
    locationId: evidence?.locationId,
    insideGeofence: evidence?.insideGeofence,
    deviceVerification: evidence?.deviceVerification,
    integrityRisk: evidence?.integrityRisk,
    updatedAt: input.updatedAt,
  };
}

export function attendanceLocationStatusFromTimeEntry(
  entry: TimeEntry,
): AttendanceLocationStatus {
  if (entry.endAt) {
    return buildAttendanceLocationStatus({
      workerId: entry.workerId,
      event: 'clock_out',
      eventAt: entry.endAt,
      evidence: entry.endEvidence,
      updatedAt: entry.updatedAt,
    });
  }

  return buildAttendanceLocationStatus({
    workerId: entry.workerId,
    event: 'clock_in',
    eventAt: entry.startAt,
    evidence: entry.startEvidence,
    updatedAt: entry.updatedAt,
  });
}

export function attendanceStatusHasCoordinates(
  status: AttendanceLocationStatus | undefined,
): status is AttendanceLocationStatus & {
  latitude: number;
  longitude: number;
} {
  return Boolean(
    status?.hasLocation &&
      Number.isFinite(status.latitude) &&
      Number.isFinite(status.longitude),
  );
}

function validateCoordinates(latitude: number, longitude: number): void {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('attendance map coordinates are invalid');
  }
}
