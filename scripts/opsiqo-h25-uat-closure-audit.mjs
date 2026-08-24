import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [];
const failures = [];
function check(name, condition, detail='') {
  checks.push({ name, pass: Boolean(condition), detail });
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
}
function includes(file, needle) { return read(file).includes(needle); }

const mapPath = 'src/lib/opsiqo-one/runtime-ui-translations-v7-32.json';
check('runtime translation map exists', exists(mapPath));
let map = {};
if (exists(mapPath)) {
  map = JSON.parse(read(mapPath));
  const keys = Object.keys(map);
  check('runtime translation map has broad coverage', keys.length >= 300, `found ${keys.length}, expected >= 300`);
  const incomplete = keys.filter((key) => {
    const row = map[key];
    return !row || typeof row.fr !== 'string' || !row.fr.trim() || typeof row.es !== 'string' || !row.es.trim() || typeof row.ar !== 'string' || !row.ar.trim();
  });
  check('all runtime translations contain fr/es/ar', incomplete.length === 0, incomplete.slice(0,10).join(' | '));
  for (const key of [
    'Enterprise HCM Command Center','My Account','Appearance','Authentication & Access','Organization & Region',
    'Import employees into People','AI prepared','Needs me','Transparency','Pay Equity','Architecture','Rewards',
    'Choose employee import file','No file selected','Auto-assigned','Employee number will be assigned automatically.'
  ]) check(`runtime translation covers: ${key}`, Boolean(map[key]), key);
}

check('runtime translator exists', exists('src/lib/opsiqo-one/runtime-ui-i18n.ts'));
check('runtime translator supports placeholder templates', includes('src/lib/opsiqo-one/runtime-ui-i18n.ts', 'compileTemplate') && includes('src/lib/opsiqo-one/runtime-ui-i18n.ts', 'substitute'));
check('legacy surface translator imports runtime resolver', includes('src/lib/opsiqo-one/legacy-surface-i18n.ts', "runtimeUiTranslation"));
check('surface translation resolution uses runtime resolver', includes('src/lib/opsiqo-one/legacy-surface-i18n.ts', 'runtimeUiTranslation(source,locale)') || includes('src/lib/opsiqo-one/legacy-surface-i18n.ts', 'runtimeUiTranslation(source, locale)'));
check('global translation resolution uses runtime resolver', includes('src/lib/opsiqo-one/legacy-surface-i18n.ts', 'runtimeUiTranslation(source,locale)') || includes('src/lib/opsiqo-one/legacy-surface-i18n.ts', 'runtimeUiTranslation(source, locale)'));
check('V7.29 historical audit accepts runtime-layer surface precedence', includes('scripts/opsiqo85-opsiqo-one-v7-29-audit.mjs', 'localPrecedenceLegacy||localPrecedenceCurrent'));
check('V7.29 historical badge audit is ASCII-safe', includes('scripts/opsiqo85-opsiqo-one-v7-29-audit.mjs', '\\u00B7'));

check('authenticated shell guard exists', exists('src/lib/auth/authenticated-shell-guard.ts'));
check('app shell wires authenticated guard', includes('src/components/app-shell.tsx', 'useAuthenticatedShellGuard') && includes('src/components/app-shell.tsx', 'useAuthenticatedShellGuard(!publicBootstrap)'));
check('session expiry coordination flag exists', includes('src/lib/auth/session-expiry-client.ts', 'opsiqo.sessionExpiryRedirecting'));
check('session expiry writes coordination flag before sign-out', includes('src/lib/auth/session-expiry-client.ts', 'sessionStorage.setItem(SESSION_EXPIRY_REDIRECT_KEY'));
check('UAT localization diagnostics exists', exists('src/lib/opsiqo-one/runtime-localization-diagnostics.ts'));
check('app shell wires localization diagnostics', includes('src/components/app-shell.tsx', 'useRuntimeLocalizationDiagnostics') && includes('src/components/app-shell.tsx', 'useRuntimeLocalizationDiagnostics(!publicBootstrap)'));

const importService = 'src/lib/data-import/employee-import.ts';
check('employee import no longer requires employee number', !includes(importService, "Employee number is required."));
check('employee import warns auto-number allocation', includes(importService, 'Employee number will be assigned automatically.'));
check('employee import duplicate-number set ignores blanks', includes(importService, 'if(nn)seenNums.add(nn)'));
check('employee import omits blank number from create payload', includes(importService, "...(r.employeeNumber?{employeeNumber:r.employeeNumber}:{})"));

check('employee import does not block blank work email', !includes(importService, 'A valid work email is required.'));
check('employee import treats blank work email as warning', includes(importService, 'Work email is optional.'));
check('employee import duplicate-email set ignores blanks', includes(importService, 'if(r.workEmail)seenEmails.add(r.workEmail)'));
check('Core HR work email schema is optional', includes('src/lib/hr/schemas.ts', 'z.string().email().optional()'));
check('Core HR does not create empty work-email index', includes('src/lib/hr/service.ts', 'if (emailIndexRef) tx.create(emailIndexRef'));
check('People create work email is optional', includes('src/components/people-table.tsx', 'required={false}'));

const importPanel = 'src/components/employee-import-panel.tsx';
check(
  'import validation messages render separately',
  includes(importPanel, 'r.rowNumber}-error-') &&
  includes(importPanel, 'errors.map')
);
check('employee import preview number optional', includes(importPanel, 'employeeNumber?:string'));
check('employee import uses custom translatable file picker', includes(importPanel, 'Choose employee import file') && includes(importPanel, 'No file selected'));
check('employee import preview shows auto-assigned number', includes(importPanel, "r.employeeNumber||'Auto-assigned'"));

check('H24 employee number counter preserved', includes('src/lib/hr/service.ts', 'counters/employeeNumber'));
check('H24 EMP sequence preserved', includes('src/lib/hr/service.ts', 'EMP-${String(sequence).padStart(6'));
check('People active-manager filter preserved', includes('src/components/people-table.tsx', "data.filter(w=>w.status==='active')") || includes('src/components/people-table.tsx', "workers.filter(w=>w.status==='active')") || includes('src/components/people-table.tsx', "workers.filter(w => w.status === 'active')"));
check('Recruiting dependent position filter preserved', includes('src/components/recruiting-workspace.tsx', 'requisitionPositions') && includes('src/components/recruiting-workspace.tsx', 'reqUnitId'));
check('Recruiting active worker choices preserved', includes('src/components/recruiting-workspace.tsx', 'eligibleWorkers'));
check('Recruiting empty-state disabled selects preserved', includes('src/components/recruiting-workspace.tsx', 'disabled={!openReqs.length}') && includes('src/components/recruiting-workspace.tsx', 'disabled={!acceptedOffers.length}'));
check('Onboarding accepted-offer applicability preserved', (includes('src/components/onboarding-workspace.tsx', 'acceptedOffers') && includes('src/components/onboarding-workspace.tsx', 'disabled={!acceptedOffers.length}')) || (includes('src/components/onboarding-workspace.tsx', 'accepted') && includes('src/components/onboarding-workspace.tsx', 'disabled={!accepted.length}')));

const autoNumberContracts = [
  ['requisition number', 'src/lib/recruiting/service.ts', 'requisitionNumber'],
  ['employee-relations reference', 'src/lib/employee-relations/service.ts', 'nextReference'],
  ['learning certificate number', 'src/lib/learning/service.ts', 'certificateNumber=`OP-'],
  ['resilience incident number', 'src/lib/resilience/service.ts', 'incidentNumber:num'],
  ['privacy request number', 'src/lib/privacy/service.ts', 'requestNumber=`PR-'],
  ['privacy incident number', 'src/lib/privacy/service.ts', 'incidentNumber=`PI-'],
  ['safety reference allocation', 'src/lib/safety/service.ts', 'nextRef('],
  ['HR service ticket reference', 'src/lib/experience/service.ts', 'ticketReference']
];
for (const [name,file,needle] of autoNumberContracts) check(`server-managed ${name}`, exists(file) && includes(file, needle));

const status = failures.length ? 'FAIL' : 'PASS';
console.log(JSON.stringify({ status, checks: checks.length, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
