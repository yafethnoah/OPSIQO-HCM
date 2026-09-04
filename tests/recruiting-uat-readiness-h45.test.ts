import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { friendlyFirebaseAuthError } from '../src/lib/auth/firebase-error-message';

const read = (path: string) => readFileSync(path, 'utf8');

describe('H45 recruiting UAT readiness and auth reliability', () => {
  it('does not reveal whether a password identity exists', () => {
    expect(friendlyFirebaseAuthError({ code: 'auth/user-not-found' }, 'signin', 'fallback')).toBe('The email or password could not be verified.');
    expect(friendlyFirebaseAuthError({ code: 'auth/wrong-password' }, 'signin', 'fallback')).toBe('The email or password could not be verified.');
    expect(friendlyFirebaseAuthError({ code: 'auth/invalid-credential' }, 'signin', 'fallback')).toBe('The email or password could not be verified.');
  });

  it('turns Firebase network failures into a user-facing recovery message', () => {
    expect(friendlyFirebaseAuthError({ code: 'auth/network-request-failed' }, 'password_reset', 'fallback')).toContain('could not connect');
  });

  it('permits Firebase emulators only in non-production CSP', () => {
    const config = read('next.config.ts');
    expect(config).toContain("process.env.NODE_ENV === 'production'");
    expect(config).toContain('http://127.0.0.1:9099');
    expect(config).toContain('http://localhost:9099');
  });

  it('publishes an explicit H45-or-later runtime marker', () => {
    const identity = read('src/lib/release/identity.ts');
    const feature = identity.match(/OPSIQO_FEATURE_RELEASE = process\.env\.OPSIQO_FEATURE_RELEASE \|\| 'H(\d+)'/);
    const product = identity.match(/OPSIQO_PRODUCT_RELEASE = process\.env\.OPSIQO_PRODUCT_RELEASE \|\| '8\.5-v7\.32-H(\d+)'/);
    expect(feature).not.toBeNull();
    expect(product).not.toBeNull();
    expect(Number(feature?.[1] || 0)).toBeGreaterThanOrEqual(45);
    expect(Number(product?.[1] || 0)).toBeGreaterThanOrEqual(45);
    expect(identity).toContain('OPSIQO_PATCH_RELEASE');
  });

  it('persists standardized question bank content only on human kit lock', () => {
    const service = read('src/lib/recruiting/service.ts');
    const createBlock = service.slice(service.indexOf('export async function createInterview'), service.indexOf('export async function getInterviewKit'));
    const updateBlock = service.slice(service.indexOf('export async function updateInterviewKit'), service.indexOf('export async function submitScorecard'));
    expect(createBlock).not.toMatch(/batch\.set\(db\.doc\(`organizations\/\$\{actor\.orgId\}\/interviewQuestionBanks/);
    expect(updateBlock).toContain("if(input.action==='lock')");
    expect(updateBlock).toContain("status:'approved_locked_core'");
  });

  it('requires assigned interviewers and evidence for scorecards', () => {
    const service = read('src/lib/recruiting/service.ts');
    const schemas = read('src/lib/recruiting/schemas.ts');
    expect(service).toContain("if (!interview.interviewerUids.includes(actor.uid))");
    expect(schemas).toContain("evidence: z.string().trim().min(3).max(1200)");
  });

  it('calculates panel variance between interviewer averages rather than within one scorecard', () => {
    const service = read('src/lib/recruiting/service.ts');
    expect(service).toContain('const evaluatorAverages=rows.map');
    expect(service).toContain('evaluatorAverages.length>1');
  });

  it('provides recruiting readiness and governed setup guidance', () => {
    const readiness = read('src/components/recruiting-readiness-panel.tsx');
    const setup = read('src/components/recruiting-ai-governance-setup.tsx');
    expect(readiness).toContain('Recruiting readiness');
    expect(readiness).toContain('No requisition is currently Open');
    expect(readiness).toContain('Duplicate active requisition titles need review');
    expect(setup).toContain('RECRUITING_ATS_MODEL');
    expect(setup).toContain('RECRUITING_ATS');
    expect(setup).toContain('independent approver');
  });
});
