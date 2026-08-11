import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { assessDrExercise, canonicalSha256 } from '../src/lib/platform-reliability/production-evidence';

function arg(name: string, fallback?: string) { const i=process.argv.indexOf(`--${name}`); return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback; }
const outputPath=arg('output','artifacts/opsiqo-dr-exercise-result.json')!;
const sourceBackup=arg('source-backup',process.env.OPSIQO_DR_SOURCE_BACKUP||'')!;
const destinationDatabase=arg('destination-database',process.env.OPSIQO_DR_RESTORE_DATABASE_ID||'')!;
const startedAt=arg('started-at',process.env.OPSIQO_DR_STARTED_AT||'')!;
const completedAt=arg('completed-at',process.env.OPSIQO_DR_COMPLETED_AT||'')!;
const backupSnapshotTime=arg('backup-snapshot-time',process.env.OPSIQO_DR_BACKUP_SNAPSHOT_TIME||'')!;
const targetRtoMinutes=Number(arg('target-rto-minutes',process.env.OPSIQO_DR_TARGET_RTO_MINUTES||'120'));
const targetRpoMinutes=Number(arg('target-rpo-minutes',process.env.OPSIQO_DR_TARGET_RPO_MINUTES||'1440'));
const sentinelVerified=(arg('sentinel-verified',process.env.OPSIQO_DR_SENTINEL_VERIFIED||'false')||'').toLowerCase()==='true';
const cleanupStatus=(arg('cleanup-status',process.env.OPSIQO_DR_CLEANUP_STATUS||'pending')||'pending') as 'completed'|'pending'|'failed';
if(!sourceBackup||!destinationDatabase) throw new Error('Source backup and destination database are required.');
if(!['completed','pending','failed'].includes(cleanupStatus)) throw new Error('cleanup-status must be completed, pending or failed.');
const assessment=assessDrExercise({startedAt,completedAt,backupSnapshotTime,targetRtoMinutes,targetRpoMinutes,sentinelVerified,cleanupStatus});
const output={schema:'opsiqo-dr-exercise-evidence-v1',generatedAt:new Date().toISOString(),sourceBackup,destinationDatabase,target:{rtoMinutes:targetRtoMinutes,rpoMinutes:targetRpoMinutes},assessment,evidenceDigest:canonicalSha256({sourceBackup,destinationDatabase,startedAt,completedAt,backupSnapshotTime,targetRtoMinutes,targetRpoMinutes,sentinelVerified,cleanupStatus})};
mkdirSync(dirname(resolve(outputPath)),{recursive:true});writeFileSync(resolve(outputPath),`${JSON.stringify(output,null,2)}\n`);console.log(`DR exercise evidence: ${assessment.status.toUpperCase()} -> ${outputPath}`);if(assessment.status!=='pass')process.exitCode=2;
