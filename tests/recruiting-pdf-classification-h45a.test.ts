import { describe, expect, it } from 'vitest';
import type { ActorContext } from '@/domain/security';
import { parseResumeIntake } from '@/lib/recruiting/ats-service';

const actor = {
  uid: 'uat-recruiter',
  orgId: 'uat-org',
  role: 'hr_admin',
  permissions: ['recruiting.manage'],
} as ActorContext;

describe('H45A PDF intake classification', () => {
  it('keeps corrupt or binary-like PDF text fail-closed as parser unavailable', async () => {
    const corrupt = '%PDF-1.7\nstream\n(XD Ã¢ QÎnlëö À X dñiëQ»Ör¹<UtBCFæ3ÕÌJ) Tj\nendstream';
    const form = new FormData();
    form.set('file', new File([corrupt], 'corrupt-resume.pdf', { type: 'application/pdf' }));
    await expect(parseResumeIntake(actor, form)).rejects.toMatchObject({
      code: 'resume_parser_unavailable',
    });
  });

  it('keeps a genuinely empty/scanned PDF eligible for Recruiting AI setup guidance', async () => {
    const scanned = '%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF';
    const form = new FormData();
    form.set('file', new File([scanned], 'scanned-resume.pdf', { type: 'application/pdf' }));
    await expect(parseResumeIntake(actor, form)).rejects.toMatchObject({
      code: 'recruiting_ai_setup_required',
    });
  });
});
