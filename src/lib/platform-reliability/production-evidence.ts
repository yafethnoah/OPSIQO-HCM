import { createHash } from 'node:crypto';

export type EvidenceGateStatus = 'pass' | 'fail';

export interface FirestoreDatabaseEvidenceInput {
  name?: string;
  locationId?: string;
  pointInTimeRecoveryEnablement?: string;
  versionRetentionPeriod?: string;
  earliestVersionTime?: string;
}

export interface FirestoreBackupScheduleEvidenceInput {
  name?: string;
  retention?: string;
  createTime?: string;
  updateTime?: string;
  dailyRecurrence?: Record<string, never>;
  weeklyRecurrence?: { day?: string };
}

export interface FirestoreBackupEvidenceInput {
  name?: string;
  database?: string;
  snapshotTime?: string;
  expireTime?: string;
  state?: string;
}

export interface CloudDrAssessmentInput {
  observedAt: string;
  database: FirestoreDatabaseEvidenceInput;
  schedules: FirestoreBackupScheduleEvidenceInput[];
  backups: FirestoreBackupEvidenceInput[];
  requirePitr: boolean;
  requireScheduledBackup: boolean;
  maxBackupAgeHours: number;
}

export interface CloudDrAssessment {
  status: EvidenceGateStatus;
  observedAt: string;
  databaseName: string;
  databaseLocation?: string;
  pitrEnabled: boolean;
  versionRetentionPeriod?: string;
  earliestVersionTime?: string;
  backupScheduleCount: number;
  readyBackupCount: number;
  latestReadyBackupName?: string;
  latestReadyBackupSnapshotTime?: string;
  latestReadyBackupAgeHours?: number;
  checks: Array<{ code: string; status: EvidenceGateStatus; message: string }>;
  limitation: string;
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

export function assessCloudDrEvidence(input: CloudDrAssessmentInput): CloudDrAssessment {
  const observedMs = parseDate(input.observedAt);
  if (observedMs === undefined) throw new Error('observedAt must be a valid RFC3339 timestamp.');
  if (!Number.isFinite(input.maxBackupAgeHours) || input.maxBackupAgeHours <= 0 || input.maxBackupAgeHours > 24 * 31) {
    throw new Error('maxBackupAgeHours must be greater than zero and no more than 31 days.');
  }

  const databaseName = String(input.database.name || '').trim();
  const pitrEnabled = input.database.pointInTimeRecoveryEnablement === 'POINT_IN_TIME_RECOVERY_ENABLED';
  const scopedBackups = databaseName ? input.backups.filter((backup) => backup.database === databaseName) : [];
  const readyBackups = scopedBackups
    .filter((backup) => backup.state === 'READY' && parseDate(backup.snapshotTime) !== undefined)
    .sort((a, b) => (parseDate(b.snapshotTime) || 0) - (parseDate(a.snapshotTime) || 0));
  const latest = readyBackups[0];
  const latestMs = parseDate(latest?.snapshotTime);
  const latestAgeHours = latestMs === undefined ? undefined : Math.max(0, (observedMs - latestMs) / 3_600_000);
  const backupFresh = latestAgeHours !== undefined && latestAgeHours <= input.maxBackupAgeHours;
  const scheduleConfigured = input.schedules.length > 0;

  const checks: CloudDrAssessment['checks'] = [];
  checks.push({
    code: 'database_identity',
    status: databaseName ? 'pass' : 'fail',
    message: 'Captured cloud DR evidence must identify the exact Firestore database resource being assessed.',
  });
  checks.push({
    code: 'pitr',
    status: !input.requirePitr || pitrEnabled ? 'pass' : 'fail',
    message: input.requirePitr
      ? 'Firestore PITR must be enabled in the observed production database.'
      : 'PITR is recorded as evidence but is not mandatory under the selected policy.',
  });
  checks.push({
    code: 'backup_schedule',
    status: !input.requireScheduledBackup || scheduleConfigured ? 'pass' : 'fail',
    message: input.requireScheduledBackup
      ? 'At least one Firestore scheduled-backup policy must be observed.'
      : 'Scheduled backups are recorded as evidence but are not mandatory under the selected policy.',
  });
  checks.push({
    code: 'ready_backup',
    status: !input.requireScheduledBackup || readyBackups.length > 0 ? 'pass' : 'fail',
    message: 'A required scheduled-backup policy must have at least one READY backup available.',
  });
  checks.push({
    code: 'backup_freshness',
    status: !input.requireScheduledBackup || backupFresh ? 'pass' : 'fail',
    message: `The latest required READY backup must be no older than ${input.maxBackupAgeHours} hours at evidence capture time.`,
  });

  return {
    status: checks.every((check) => check.status === 'pass') ? 'pass' : 'fail',
    observedAt: input.observedAt,
    databaseName: databaseName || '(unknown)',
    databaseLocation: input.database.locationId,
    pitrEnabled,
    versionRetentionPeriod: input.database.versionRetentionPeriod,
    earliestVersionTime: input.database.earliestVersionTime,
    backupScheduleCount: input.schedules.length,
    readyBackupCount: readyBackups.length,
    latestReadyBackupName: latest?.name,
    latestReadyBackupSnapshotTime: latest?.snapshotTime,
    latestReadyBackupAgeHours: latestAgeHours === undefined ? undefined : Number(latestAgeHours.toFixed(2)),
    checks,
    limitation: 'This assessment verifies captured Firestore configuration/backup metadata only. It does not prove application-level recoverability; a controlled restore exercise and integrity validation remain separately required.',
  };
}

export interface DrExerciseAssessmentInput {
  startedAt: string;
  completedAt: string;
  backupSnapshotTime: string;
  targetRtoMinutes: number;
  targetRpoMinutes: number;
  sentinelVerified: boolean;
  cleanupStatus: 'completed' | 'pending' | 'failed';
}

export interface DrExerciseAssessment {
  status: 'pass' | 'partial' | 'fail';
  actualRtoMinutes: number;
  actualRpoMinutes: number;
  rtoMet: boolean;
  rpoMet: boolean;
  sentinelVerified: boolean;
  cleanupStatus: DrExerciseAssessmentInput['cleanupStatus'];
  limitation: string;
}

export function assessDrExercise(input: DrExerciseAssessmentInput): DrExerciseAssessment {
  const started = parseDate(input.startedAt);
  const completed = parseDate(input.completedAt);
  const snapshot = parseDate(input.backupSnapshotTime);
  if (started === undefined || completed === undefined || snapshot === undefined) throw new Error('Exercise timestamps must be valid RFC3339 timestamps.');
  if (completed < started) throw new Error('completedAt must not precede startedAt.');
  if (snapshot > started) throw new Error('backupSnapshotTime must not be after exercise start.');
  if (!Number.isFinite(input.targetRtoMinutes) || input.targetRtoMinutes <= 0) throw new Error('targetRtoMinutes must be positive.');
  if (!Number.isFinite(input.targetRpoMinutes) || input.targetRpoMinutes < 0) throw new Error('targetRpoMinutes must be zero or positive.');

  const actualRtoMinutes = Number(((completed - started) / 60_000).toFixed(2));
  const actualRpoMinutes = Number(((started - snapshot) / 60_000).toFixed(2));
  const rtoMet = actualRtoMinutes <= input.targetRtoMinutes;
  const rpoMet = actualRpoMinutes <= input.targetRpoMinutes;
  const corePass = rtoMet && rpoMet && input.sentinelVerified;
  const status: DrExerciseAssessment['status'] = corePass && input.cleanupStatus === 'completed'
    ? 'pass'
    : input.sentinelVerified && input.cleanupStatus !== 'failed'
      ? 'partial'
      : 'fail';

  return {
    status,
    actualRtoMinutes,
    actualRpoMinutes,
    rtoMet,
    rpoMet,
    sentinelVerified: input.sentinelVerified,
    cleanupStatus: input.cleanupStatus,
    limitation: 'The exercise result applies only to the tested backup, database, sentinel and execution path. It is not a guarantee of future recovery performance.',
  };
}

export interface ProductionEvidenceBundleInput {
  releaseVersion: string;
  sourceCommit: string;
  workflowRunRef: string;
  generatedAt: string;
  gates: Record<string, EvidenceGateStatus>;
  artifacts: Array<{ name: string; sha256: string; evidenceRef: string }>;
  cloudDrStatus: EvidenceGateStatus;
  drExerciseStatus: 'pass' | 'partial' | 'fail';
}

export function productionEvidenceReady(input: ProductionEvidenceBundleInput) {
  const requiredGates = [
    'lockfile', 'lockfile_review', 'source_manifest', 'npm_ci', 'npm_audit', 'static_scan', 'secret_scan', 'codeql', 'sbom', 'typecheck', 'unit_tests', 'rules_tests',
    'build', 'ai_evaluate', 'ai_governance', 'preflight', 'integrated_uat', 'provenance',
  ];
  const missing = requiredGates.filter((name) => input.gates[name] !== 'pass');
  const missingArtifacts = input.artifacts.filter((artifact) => !/^[a-f0-9]{64}$/i.test(artifact.sha256) || artifact.evidenceRef.trim().length < 3);
  const ready = missing.length === 0 && missingArtifacts.length === 0 && input.cloudDrStatus === 'pass' && input.drExerciseStatus === 'pass';
  return {
    ready,
    missingGates: missing,
    invalidArtifacts: missingArtifacts.map((artifact) => artifact.name),
    limitation: 'A ready bundle proves that the configured CI/cloud evidence gates supplied traceable evidence for this release. It does not certify security, regulatory compliance, or permanent disaster-recovery capability.',
  };
}

export function canonicalSha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(sortJson(value))).digest('hex');
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, sortJson(child)]));
  }
  return value;
}
