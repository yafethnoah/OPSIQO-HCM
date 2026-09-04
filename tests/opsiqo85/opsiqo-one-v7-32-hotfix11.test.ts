import { describe, expect, it } from 'vitest';
import type { OnboardingTask, PrehireDocument } from '@/domain/onboarding';
import { evaluateRequiredPrehireDocumentScans, latestPrehireDocumentForTask } from '@/lib/onboarding/scan-policy';
import { prehireDocumentActionSchema } from '@/lib/onboarding/schemas';
import { documentActionSchema } from '@/lib/compliance/schemas';

const task = (overrides: Partial<OnboardingTask> = {}): OnboardingTask => ({
  id: 'task-doc', caseId: 'case-1', title: 'Signed agreement', taskType: 'document', phase: 'pre_start', ownerType: 'candidate', required: true,
  blockingActivation: true, status: 'completed', createdAt: '2026-08-20T10:00:00.000Z', updatedAt: '2026-08-20T10:00:00.000Z', ...overrides,
});
const doc = (overrides: Partial<PrehireDocument> = {}): PrehireDocument => ({
  id: 'doc-1', caseId: 'case-1', taskId: 'task-doc', fileName: 'signed.pdf', contentType: 'application/pdf', size: 100, storagePath: 'private/path',
  sha256: 'abc', scanStatus: 'not_scanned', uploadedAt: '2026-08-20T10:00:00.000Z', uploadedBy: 'candidate', ...overrides,
});

describe('V7.32 hotfix 11 prehire scan governance', () => {
  it('uses the latest candidate upload as the authoritative scan state', () => {
    const latest = latestPrehireDocumentForTask([
      doc({ id:'old', scanStatus:'clean', uploadedAt:'2026-08-19T10:00:00.000Z' }),
      doc({ id:'new', scanStatus:'blocked', uploadedAt:'2026-08-20T10:00:00.000Z' }),
    ], 'task-doc');
    expect(latest?.id).toBe('new');
  });

  it('fails closed for missing, quarantined, or unscanned required prehire documents', () => {
    expect(evaluateRequiredPrehireDocumentScans([task()], [], true)).toEqual({ ok:false, code:'prehire_document_missing', taskTitle:'Signed agreement' });
    expect(evaluateRequiredPrehireDocumentScans([task()], [doc({ scanStatus:'blocked' })], true)).toEqual({ ok:false, code:'prehire_document_quarantined', taskTitle:'Signed agreement' });
    expect(evaluateRequiredPrehireDocumentScans([task()], [doc()], true)).toEqual({ ok:false, code:'prehire_scan_required', taskTitle:'Signed agreement' });
  });

  it('passes only when the latest required prehire document is clean, while demo/non-production may explicitly bypass the clean-scan gate', () => {
    expect(evaluateRequiredPrehireDocumentScans([task()], [doc({ scanStatus:'clean', scanEvidenceRef:'scanner-run-123' })], true)).toEqual({ ok:true });
    expect(evaluateRequiredPrehireDocumentScans([task()], [doc()], false)).toEqual({ ok:true });
  });

  it('keeps scan controls schema-bounded for both prehire and employee documents', () => {
    expect(prehireDocumentActionSchema.safeParse({ action:'set_scan_clean', scanEvidenceRef:'scanner-run-123' }).success).toBe(true);
    expect(prehireDocumentActionSchema.safeParse({ action:'approve_without_scan' }).success).toBe(false);
    expect(documentActionSchema.safeParse({ action:'set_scan_clean', scanEvidenceRef:'scanner-run-123' }).success).toBe(true);
    expect(documentActionSchema.safeParse({ action:'set_scan_clean', scanEvidenceRef:'x'.repeat(1001) }).success).toBe(false);
  });
});
