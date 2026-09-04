export type ClockPolicyLike = {
  captureGeolocation?: boolean;
  geofenceMode?: string;
};

export function policyRequiresClockLocation(policy: ClockPolicyLike | null | undefined) {
  if (!policy) return false;
  return Boolean(policy.captureGeolocation || (policy.geofenceMode || 'disabled') !== 'disabled');
}

export function clockControlState(input: {
  isSelf: boolean;
  timecardReady: boolean;
  hasOpenEntry: boolean;
  busy: boolean;
}) {
  const available = input.isSelf && input.timecardReady;
  return {
    available,
    canClockIn: available && !input.hasOpenEntry && !input.busy,
    canClockOut: available && input.hasOpenEntry && !input.busy,
  };
}

export function timecardBlockingMessage(code?: string) {
  if (code === 'time_policy_missing') {
    return 'Clocking unavailable — the employee’s assigned time policy is missing. HR must repair the time profile.';
  }
  return 'Clocking unavailable — HR must configure and assign an active time policy.';
}
