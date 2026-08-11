import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { productionEvidenceReady } from '../src/lib/platform-reliability/production-evidence';

const releaseVersion=String(process.env.OPSIQO_RELEASE_VERSION||'').trim();
if(!releaseVersion)throw new Error('OPSIQO_RELEASE_VERSION is required.');
const sourceCommit=String(process.env.GITHUB_SHA||process.env.OPSIQO_RELEASE_COMMIT||'').trim();
const repository=String(process.env.GITHUB_REPOSITORY||'').trim();
const runId=String(process.env.GITHUB_RUN_ID||'').trim();
const workflowRunRef=String(process.env.OPSIQO_CI_EVIDENCE_REF|| (repository&&runId?`https://github.com/${repository}/actions/runs/${runId}`:'')).trim();
if(!sourceCommit||!workflowRunRef)throw new Error('Traceable source commit and CI workflow run reference are required.');

const files:Record<string,string>={
  lockfile:'package-lock.json',
  source_manifest:'SOURCE_MANIFEST.sha256',
  lockfile_review:'artifacts/committed-lockfile-review.json',
  sbom:'artifacts/opsiqo-hcm.cdx.json',
  provenance:'artifacts/opsiqo-hcm.provenance.json',
  build:'opsiqo-build.tgz',
  cloud_dr:'artifacts/opsiqo-cloud-dr-evidence.json',
  dr_exercise:'artifacts/opsiqo-dr-exercise-result.json',
};
function sha(path:string){return createHash('sha256').update(readFileSync(resolve(path))).digest('hex')}
const artifacts=Object.entries(files).map(([name,path])=>{if(!existsSync(path))throw new Error(`Required production evidence artifact is missing: ${path}`);return{name,sha256:sha(path),evidenceRef:`${workflowRunRef}#${basename(path)}`}});
const cloudDr=JSON.parse(readFileSync(files.cloud_dr,'utf8'));
const drExercise=JSON.parse(readFileSync(files.dr_exercise,'utf8'));
const gateNames=['lockfile','lockfile_review','source_manifest','npm_ci','npm_audit','static_scan','secret_scan','codeql','sbom','typecheck','unit_tests','rules_tests','build','ai_evaluate','ai_governance','preflight','integrated_uat','provenance'];
const gates=Object.fromEntries(gateNames.map(name=>[name,String(process.env[`OPSIQO_EVIDENCE_${name.toUpperCase()}`]||'fail').toLowerCase()==='pass'?'pass':'fail'])) as Record<string,'pass'|'fail'>;
const generatedAt=new Date().toISOString();
const core={releaseVersion,sourceCommit,workflowRunRef,generatedAt,gates,artifacts,cloudDrStatus:cloudDr?.assessment?.status==='pass'?'pass':'fail',drExerciseStatus:['pass','partial','fail'].includes(drExercise?.assessment?.status)?drExercise.assessment.status:'fail'} as const;
const readiness=productionEvidenceReady(core);
const bundle={schema:'opsiqo-production-evidence-bundle-v1',...core,readiness};
const out=resolve('artifacts/opsiqo-production-evidence.json');mkdirSync(dirname(out),{recursive:true});writeFileSync(out,`${JSON.stringify(bundle,null,2)}\n`);console.log(`Production evidence bundle: ${readiness.ready?'READY':'BLOCKED'} -> ${out}`);if(!readiness.ready){console.error(JSON.stringify(readiness,null,2));process.exitCode=2;}
