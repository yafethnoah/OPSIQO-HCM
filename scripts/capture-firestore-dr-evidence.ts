import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { assessCloudDrEvidence, canonicalSha256 } from '../src/lib/platform-reliability/production-evidence';

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}
function readJson(path: string) { return JSON.parse(readFileSync(resolve(path), 'utf8')); }
function asArray(value: unknown, keys: string[]) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    for (const key of keys) {
      const candidate = (value as Record<string, unknown>)[key];
      if (Array.isArray(candidate)) return candidate;
    }
  }
  return [];
}

const databasePath = arg('database', 'artifacts/firestore-database.json')!;
const schedulesPath = arg('schedules', 'artifacts/firestore-backup-schedules.json')!;
const backupsPath = arg('backups', 'artifacts/firestore-backups.json')!;
const outputPath = arg('output', 'artifacts/opsiqo-cloud-dr-evidence.json')!;
const observedAt = arg('observed-at', new Date().toISOString())!;
const requirePitr = (arg('require-pitr', process.env.OPSIQO_CLOUD_DR_REQUIRE_PITR || 'true') || '').toLowerCase() === 'true';
const requireScheduledBackup = (arg('require-scheduled-backup', process.env.OPSIQO_CLOUD_DR_REQUIRE_SCHEDULED_BACKUP || 'true') || '').toLowerCase() === 'true';
const maxBackupAgeHours = Number(arg('max-backup-age-hours', process.env.OPSIQO_CLOUD_DR_MAX_BACKUP_AGE_HOURS || '36'));

const database = readJson(databasePath);
const schedulesRaw = readJson(schedulesPath);
const backupsRaw = readJson(backupsPath);
const assessment = assessCloudDrEvidence({
  observedAt,
  database,
  schedules: asArray(schedulesRaw, ['backupSchedules']),
  backups: asArray(backupsRaw, ['backups']),
  requirePitr,
  requireScheduledBackup,
  maxBackupAgeHours,
});
const output = {
  schema: 'opsiqo-cloud-dr-evidence-v1',
  generatedAt: new Date().toISOString(),
  source: {
    databaseEvidenceSha256: canonicalSha256(database),
    backupSchedulesEvidenceSha256: canonicalSha256(schedulesRaw),
    backupsEvidenceSha256: canonicalSha256(backupsRaw),
  },
  policy: { requirePitr, requireScheduledBackup, maxBackupAgeHours },
  assessment,
};
mkdirSync(dirname(resolve(outputPath)), { recursive: true });
writeFileSync(resolve(outputPath), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Cloud DR evidence: ${assessment.status.toUpperCase()} -> ${outputPath}`);
for (const check of assessment.checks) console.log(`${check.status.toUpperCase().padEnd(4)} ${check.code}: ${check.message}`);
if (assessment.status !== 'pass') process.exitCode = 2;
