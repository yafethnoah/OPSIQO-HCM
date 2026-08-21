import fs from 'node:fs';import path from 'node:path';
const root=process.cwd();const artifactDir=path.join(root,'artifacts');const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return null}};
const readiness=read(path.join(artifactDir,'v7-29-deployment-readiness.json'));
const ledger=read(path.join(artifactDir,'v7-29-certification-ledger.json'));
const human=read(path.join(artifactDir,'v7-29-human-signoff.json'));
const validApproval=(x)=>Boolean(x?.approved===true&&String(x?.reviewedBy||'').trim()&&String(x?.reviewedAt||'').trim());
const status={
  sourceCertified:Boolean(readiness?.status?.sourceCertified),
  dependencyCertified:Boolean(readiness?.status?.dependencyCertified),
  browserUatCertified:Boolean(readiness?.status?.browserUatCertified),
  manualAccessibilityCertified:validApproval(human?.manualAccessibility),
  connectorUatCertified:validApproval(human?.connectorUat),
  releaseChangeApproved:validApproval(human?.releaseChangeApproval),
  productionDeploymentApproved:validApproval(human?.productionDeployment)
};
status.automatedProductionCandidate=status.sourceCertified&&status.dependencyCertified&&status.browserUatCertified;
status.readyForProductionDeployment=status.automatedProductionCandidate&&status.manualAccessibilityCertified&&status.connectorUatCertified&&status.releaseChangeApproved;
status.productionDeployed=status.readyForProductionDeployment&&status.productionDeploymentApproved;
const firstFail=Array.isArray(ledger?.gates)?ledger.gates.find(g=>g.status==='fail'):null;
const report={version:'7.29',generatedAt:new Date().toISOString(),status,firstAutomatedFailure:firstFail?{name:firstFail.name,exitCode:firstFail.exitCode}:null,humanSignoffFile:human?'artifacts/v7-29-human-signoff.json':null,boundary:'Final release attestation is evidence aggregation only. It performs no deployment, reads no .env files, does not inspect secret values, does not treat automated browser checks as formal WCAG conformance, and cannot mark production deployed without explicit human deployment approval.'};
fs.mkdirSync(artifactDir,{recursive:true});fs.writeFileSync(path.join(artifactDir,'v7-29-final-release-attestation.json'),JSON.stringify(report,null,2));
console.log('\nOPSIQO ONE V7.29 FINAL RELEASE ATTESTATION');for(const[k,v]of Object.entries(status))console.log(`${v?'PASS':'PENDING'} ${k}`);if(firstFail)console.log(`FIRST AUTOMATED FAILURE ${firstFail.name} (exit ${firstFail.exitCode})`);console.log('Evidence: artifacts/v7-29-final-release-attestation.json');console.log('Boundary: no production deployment is performed by this attestation.');
