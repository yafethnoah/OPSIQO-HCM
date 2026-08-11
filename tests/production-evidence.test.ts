import { describe, expect, it } from 'vitest';
import { assessCloudDrEvidence, assessDrExercise, productionEvidenceReady } from '../src/lib/platform-reliability/production-evidence';

describe('v3.6.1 production evidence closure',()=>{
  it('passes Firestore PITR and fresh scheduled backup evidence',()=>{
    const r=assessCloudDrEvidence({observedAt:'2026-08-11T18:00:00Z',database:{name:'projects/p/databases/(default)',pointInTimeRecoveryEnablement:'POINT_IN_TIME_RECOVERY_ENABLED',versionRetentionPeriod:'604800s'},schedules:[{name:'schedule-1',retention:'1209600s'}],backups:[{name:'backup-1',database:'projects/p/databases/(default)',snapshotTime:'2026-08-11T06:00:00Z',state:'READY'}],requirePitr:true,requireScheduledBackup:true,maxBackupAgeHours:24});
    expect(r.status).toBe('pass');expect(r.pitrEnabled).toBe(true);expect(r.readyBackupCount).toBe(1);
  });
  it('does not count a READY backup from another Firestore database',()=>{
    const r=assessCloudDrEvidence({observedAt:'2026-08-11T18:00:00Z',database:{name:'projects/p/databases/(default)',pointInTimeRecoveryEnablement:'POINT_IN_TIME_RECOVERY_ENABLED'},schedules:[{name:'schedule-1'}],backups:[{name:'backup-other',database:'projects/p/databases/other',snapshotTime:'2026-08-11T17:00:00Z',state:'READY'}],requirePitr:true,requireScheduledBackup:true,maxBackupAgeHours:24});
    expect(r.status).toBe('fail');expect(r.readyBackupCount).toBe(0);
  });
  it('fails when required PITR or backup evidence is missing',()=>{
    const r=assessCloudDrEvidence({observedAt:'2026-08-11T18:00:00Z',database:{pointInTimeRecoveryEnablement:'POINT_IN_TIME_RECOVERY_DISABLED'},schedules:[],backups:[],requirePitr:true,requireScheduledBackup:true,maxBackupAgeHours:24});
    expect(r.status).toBe('fail');expect(r.checks.filter(c=>c.status==='fail').length).toBeGreaterThanOrEqual(3);
  });
  it('measures restore RTO and RPO and requires sentinel plus cleanup',()=>{
    const r=assessDrExercise({startedAt:'2026-08-11T12:00:00Z',completedAt:'2026-08-11T12:40:00Z',backupSnapshotTime:'2026-08-11T11:00:00Z',targetRtoMinutes:60,targetRpoMinutes:120,sentinelVerified:true,cleanupStatus:'completed'});
    expect(r).toMatchObject({status:'pass',actualRtoMinutes:40,actualRpoMinutes:60,rtoMet:true,rpoMet:true});
  });
  it('blocks a release evidence bundle when any mandatory gate or DR exercise is not green',()=>{
    const names=['lockfile','lockfile_review','source_manifest','npm_ci','npm_audit','static_scan','secret_scan','codeql','sbom','typecheck','unit_tests','rules_tests','build','ai_evaluate','ai_governance','preflight','integrated_uat','provenance'];
    const gates=Object.fromEntries(names.map(n=>[n,'pass'])) as Record<string,'pass'|'fail'>;gates.build='fail';
    const r=productionEvidenceReady({releaseVersion:'3.6.1',sourceCommit:'abc',workflowRunRef:'ci/ref',generatedAt:'2026-08-11T18:00:00Z',gates,artifacts:[{name:'x',sha256:'a'.repeat(64),evidenceRef:'ci/ref#x'}],cloudDrStatus:'pass',drExerciseStatus:'partial'});
    expect(r.ready).toBe(false);expect(r.missingGates).toContain('build');
  });
});
