import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const workspacePath = 'src/components/time-workspace.tsx';
const helperPath = 'src/lib/time/clock-preflight.ts';
const offlinePath = 'src/lib/time/offline-attendance.ts';
const servicePath = 'src/lib/time/service.ts';
const testPath = 'tests/h48-2-time-clock-preflight.test.ts';

for (const path of [workspacePath, helperPath, offlinePath, servicePath, testPath]) {
  check(`Present: ${path}`, existsSync(path));
}

const ui = read(workspacePath);
const helper = read(helperPath);
const offline = read(offlinePath);
const service = read(servicePath);

check('Missing-policy errors are handled as a clocking preflight state', ui.includes("['time_policy_required','time_policy_missing']"));
check('Clock-in control is governed by preflight state', ui.includes('disabled={!canClockIn}'));
check('Clock-out control is governed by open-entry state', ui.includes('disabled={!canClockOut}'));
check('Clock errors render inside the timecard', ui.includes('role="alert"') && ui.includes('{clockError}'));
check('Location capture is skipped when policy does not require it', ui.includes("if(!required)return undefined"));
check('UI explains when location is not collected', ui.includes('Location is not collected by the current attendance policy.'));
check('UI explains location is event-scoped when required', ui.includes('Location is requested only when you clock because the active attendance policy requires it.'));
check('Pure preflight helper gates open-entry states', helper.includes('canClockIn: available && !input.hasOpenEntry') && helper.includes('canClockOut: available && input.hasOpenEntry'));
check('Pure preflight helper derives policy location requirement', helper.includes("(policy.geofenceMode || 'disabled') !== 'disabled'"));
check('Offline payload no longer forces location evidence', offline.includes('location?:{'));
check('Backend identifies offline sync independently of location presence', service.includes('const offlineSync=Boolean(input.offlineEventId||input.clientCapturedAt)'));
check('Backend requires paired offline event metadata', service.includes('offline_event_metadata_required'));
check('Backend records offline source from offline metadata', service.includes("source:offlineSync?'offline_sync':'web_clock'"));

for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}`);
const passed = checks.filter(c => c.ok).length;
console.log(`\nH48.2 time-clock preflight audit: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
