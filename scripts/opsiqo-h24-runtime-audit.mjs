import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const requireText = (file, text, label) => checks.push({ label, ok: read(file).includes(text), file });
const forbidText = (file, text, label) => checks.push({ label, ok: !read(file).includes(text), file });

requireText('src/lib/opsiqo-one/runtime-locale.ts', "root.dir = direction", 'runtime locale writes document direction');
requireText('src/lib/opsiqo-one/runtime-locale.ts', "window.dispatchEvent(new CustomEvent('opsiqo:locale-changed'", 'runtime locale dispatches locale change');
requireText('src/components/app-shell.tsx', 'useRuntimeLocaleSync(!publicBootstrap);', 'app shell synchronizes organization locale');
requireText('src/components/settings-workspace.tsx', 'applyRuntimeLocale(r.data.defaultLocale)', 'settings applies saved locale immediately');
requireText('src/components/superapp-workspace.tsx', 'useShellLocale()', 'My OPSIQO follows live shell locale when preference is auto');
requireText('src/app/globals.css', 'html[dir="rtl"]', 'RTL stylesheet rules are present');

requireText('src/lib/hr/service.ts', "counters/employeeNumber", 'employee number uses organization sequence');
requireText('src/lib/hr/service.ts', "EMP-${String(sequence).padStart(6, '0')}", 'employee number format is deterministic');
requireText('src/lib/hr/schemas.ts', 'employeeNumber: z.string().trim().min(1).max(40).optional()', 'direct employee number is optional');
requireText('src/lib/recruiting/schemas.ts', 'employeeNumber: z.string().trim().min(1).max(40).optional()', 'recruiting employee number is optional');
requireText('src/lib/onboarding/schemas.ts', 'employeeNumber:z.string().trim().min(1).max(40).optional()', 'prehire employee number is optional');
forbidText('src/components/people-table.tsx', 'name="employeeNumber"', 'People no longer asks for employee number');
forbidText('src/components/recruiting-workspace.tsx', 'name="employeeNumber"', 'Recruiting no longer asks for employee number');
forbidText('src/components/onboarding-workspace.tsx', 'name="employeeNumber"', 'Onboarding no longer asks for employee number');

requireText('src/components/recruiting-workspace.tsx', 'requisitionPositions=positions.filter', 'requisition positions are filtered by organization unit');
requireText('src/components/recruiting-workspace.tsx', 'setReqPositionId(\'\')', 'dependent requisition position clears when unit changes');
requireText('src/components/recruiting-workspace.tsx', 'eligibleWorkers=workers.filter', 'worker dropdowns exclude inactive workers');
requireText('src/components/onboarding-workspace.tsx', 'disabled={!accepted.length}', 'accepted-offer dropdown is disabled when inapplicable');
requireText('src/components/people-table.tsx', "data.filter(w=>w.status==='active')", 'manager dropdown excludes inactive workers');

requireText('src/lib/http/client.ts', "opsiqo:session-expired", 'HTTP client emits session-expired event');
requireText('src/components/app-shell.tsx', 'useSessionExpiryRedirect(!publicBootstrap);', 'app shell centrally redirects expired sessions');

const failures = checks.filter((check) => !check.ok);
const result = {
  status: failures.length ? 'FAIL' : 'PASS',
  checks: checks.length,
  failures: failures.map(({ label, file }) => ({ label, file })),
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = failures.length ? 1 : 0;
