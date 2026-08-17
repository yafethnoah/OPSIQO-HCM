import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
describe('OPSIQO 8.5 V7.9.2 certification repair',()=>{
  it('keeps manager ATS team scope without granting organization-wide authority',()=>{const s=fs.readFileSync('src/lib/recruiting/ats-service.ts','utf8');expect(s).toContain("recruiting.manage.team");expect(s).toContain('scopedRequisition');});
  it('keeps employment and workflow internals behind least-privilege boundaries',()=>{const r=fs.readFileSync('firestore.rules','utf8');expect(r).toContain('resource.data.workerId == membership(orgId).data.workerId');expect(r).toContain('match /workflowDefinitions/{docId} { allow read, write: if false; }');expect(r).toContain('match /workflowRuns/{docId} { allow read, write: if false; }');expect(r).toContain('match /workflowStepRuns/{docId} { allow read, write: if false; }');});
  it('uses WIF/ADC and no long-lived Firebase private key in production CI',()=>{const y=fs.readFileSync('.github/workflows/production-promotion.yml','utf8');expect(y).toContain('google-github-actions/auth@v2');expect(y).toContain('OPSIQO_FIREBASE_ADMIN_AUTH_MODE: adc');expect(y).not.toContain('FIREBASE_PRIVATE_KEY');expect(y).not.toContain('FIREBASE_CLIENT_EMAIL');});
  it('distinguishes source commit from deployment revision',()=>{const s=fs.readFileSync('src/lib/release/identity.ts','utf8');expect(s).toContain('sourceCommit');expect(s).toContain('deploymentRevision');expect(s).toContain('K_REVISION');});
});
