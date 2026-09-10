import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { clockControlState, policyRequiresClockLocation, timecardBlockingMessage } from '@/lib/time/clock-preflight';

const workspace = () => readFileSync('src/components/time-workspace.tsx', 'utf8');
const offline = () => readFileSync('src/lib/time/offline-attendance.ts', 'utf8');
const service = () => readFileSync('src/lib/time/service.ts', 'utf8');

describe('H48.2 time-clock preflight closure', () => {
  it('blocks clock controls until a governed timecard is available and respects open-entry state', () => {
    expect(clockControlState({ isSelf: true, timecardReady: false, hasOpenEntry: false, busy: false })).toEqual({
      available: false,
      canClockIn: false,
      canClockOut: false,
    });
    expect(clockControlState({ isSelf: true, timecardReady: true, hasOpenEntry: false, busy: false })).toMatchObject({
      canClockIn: true,
      canClockOut: false,
    });
    expect(clockControlState({ isSelf: true, timecardReady: true, hasOpenEntry: true, busy: false })).toMatchObject({
      canClockIn: false,
      canClockOut: true,
    });
  });

  it('requests location only when the active attendance policy requires it', () => {
    expect(policyRequiresClockLocation(undefined)).toBe(false);
    expect(policyRequiresClockLocation({ captureGeolocation: false, geofenceMode: 'disabled' })).toBe(false);
    expect(policyRequiresClockLocation({ captureGeolocation: true, geofenceMode: 'disabled' })).toBe(true);
    expect(policyRequiresClockLocation({ captureGeolocation: false, geofenceMode: 'advisory' })).toBe(true);
  });

  it('provides actionable HR configuration messages for missing policies', () => {
    expect(timecardBlockingMessage('time_policy_required')).toMatch(/configure and assign an active time policy/i);
    expect(timecardBlockingMessage('time_policy_missing')).toMatch(/assigned time policy is missing/i);
  });

  it('renders disabled state, inline errors, and privacy guidance before geolocation', () => {
    const ui = workspace();
    expect(ui).toContain("['time_policy_required','time_policy_missing']");
    expect(ui).toContain('disabled={!canClockIn}');
    expect(ui).toContain('disabled={!canClockOut}');
    expect(ui).toContain("if(!required)return undefined");
    expect(ui).toContain('role="alert"');
    expect(ui).toContain('Location is not collected by the current attendance policy.');
  });

  it('allows governed offline clocking without forcing location when the policy does not require it', () => {
    expect(offline()).toContain('location?:{');
    const backend = service();
    expect(backend).toContain("const offlineSync=Boolean(input.offlineEventId||input.location?.source==='offline_sync')");
    expect(backend).not.toContain('const offlineSync=Boolean(input.offlineEventId||input.clientCapturedAt)');
    expect(backend).toContain("source:offlineSync?'offline_sync':'web_clock'");
    expect(backend).toContain('offline_event_metadata_required');
  });
});
