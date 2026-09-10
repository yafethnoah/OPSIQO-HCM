import { describe, expect, it } from 'vitest';
import type { ActorContext } from '@/domain/security';
import { parseResumeIntake } from '@/lib/recruiting/ats-service';

const actor = {
  uid: 'uat-recruiter',
  orgId: 'uat-org',
  role: 'hr_admin',
  permissions: ['recruiting.manage'],
} as ActorContext;

/**
 * Builds a structurally valid one-page PDF with no text content.
 *
 * This represents the document condition we actually want to test:
 * a valid PDF whose content requires document vision / governed AI.
 *
 * It must not use a malformed Catalog-only pseudo-PDF because a real
 * PDF.js parser correctly classifies malformed document structure as unsafe.
 */
function validBlankPdf(): Buffer {
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');

  pdf += 'xref\n0 4\n';
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i <= 3; i += 1) {
    pdf += `${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`;
  }

  pdf += 'trailer\n';
  pdf += '<< /Size 4 /Root 1 0 R >>\n';
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF\n';

  return Buffer.from(pdf, 'latin1');
}

describe('H45A PDF intake classification', () => {
  it('keeps corrupt or binary-like PDF text fail-closed as parser unavailable', async () => {
    const corrupt =
      '%PDF-1.7\nstream\n(XD Ã¢ QÎnlëö À X dñiëQ»Ör¹<UtBCFæ3ÕÌJ) Tj\nendstream';

    const form = new FormData();

    form.set(
      'file',
      new File(
        [corrupt],
        'corrupt-resume.pdf',
        { type: 'application/pdf' },
      ),
    );

    await expect(
      parseResumeIntake(actor, form),
    ).rejects.toMatchObject({
      code: 'resume_parser_unavailable',
    });
  });

  it('keeps a valid PDF with no text layer eligible for Recruiting AI setup guidance', async () => {
    const scanned = validBlankPdf();

    const form = new FormData();

    form.set(
      'file',
      new File(
        [new Uint8Array(scanned)],
        'scanned-resume.pdf',
        { type: 'application/pdf' },
      ),
    );

    await expect(
      parseResumeIntake(actor, form),
    ).rejects.toMatchObject({
      code: 'recruiting_ai_setup_required',
    });
  });
});