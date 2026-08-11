import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { productionEvidenceReady } from '../src/lib/platform-reliability/production-evidence';
const path=resolve(process.argv[2]||'artifacts/opsiqo-production-evidence.json');if(!existsSync(path))throw new Error(`Evidence bundle not found: ${path}`);const bundle=JSON.parse(readFileSync(path,'utf8'));
if(bundle.schema!=='opsiqo-production-evidence-bundle-v1')throw new Error('Unsupported production evidence bundle schema.');
const result=productionEvidenceReady(bundle);let mismatch=false;for(const artifact of bundle.artifacts||[]){const localMap:Record<string,string>={lockfile:'package-lock.json',source_manifest:'SOURCE_MANIFEST.sha256',lockfile_review:'artifacts/committed-lockfile-review.json',sbom:'artifacts/opsiqo-hcm.cdx.json',provenance:'artifacts/opsiqo-hcm.provenance.json',build:'opsiqo-build.tgz',cloud_dr:'artifacts/opsiqo-cloud-dr-evidence.json',dr_exercise:'artifacts/opsiqo-dr-exercise-result.json'};const local=localMap[artifact.name];if(local&&existsSync(local)){const digest=createHash('sha256').update(readFileSync(local)).digest('hex');if(digest!==artifact.sha256){console.error(`SHA-256 mismatch: ${artifact.name}`);mismatch=true;}}}
console.log(JSON.stringify({...result,artifactHashMismatch:mismatch},null,2));if(!result.ready||mismatch)process.exitCode=2;
