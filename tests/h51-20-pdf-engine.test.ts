import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  assessPdfTextQuality,
  extractPdfDocument,
} from '@/lib/data-import/pdf-engine';

describe('H51.20 shared PDF intelligence engine', () => {
  it('accepts multilingual human-readable text', () => {
    const english = assessPdfTextQuality(
      'Employee Name Shadi Alktaifan Human Resources Manager employment experience education professional skills certification and management responsibilities.',
    );

    const arabic = assessPdfTextQuality(
      'اسم الموظف شادي القطيفان مدير الموارد البشرية الخبرة المهنية التعليم المهارات إدارة الموارد البشرية والتوظيف والتدريب والتطوير المؤسسي.',
    );

    expect(english.readable).toBe(true);
    expect(arabic.readable).toBe(true);
  });

  it('rejects empty and binary-like extraction', () => {
    expect(assessPdfTextQuality('').readable).toBe(false);

    const bad = assessPdfTextQuality(
      '\u0001\u0002\u0003\u0004\u0005 binary binary binary',
    );

    expect(bad.readable).toBe(false);
  });

  it('uses the existing real Recruiting PDF probe through PDF.js', async () => {
    const providerSource = readFileSync(
      'src/lib/recruiting/ats-provider.ts',
      'utf8',
    );

    const match =
      /RECRUITING_DOCUMENT_PROBE_PDF_B64='([^']+)'/.exec(providerSource);

    expect(match?.[1]).toBeTruthy();

    const bytes = Buffer.from(match![1]!, 'base64');

    const result = await extractPdfDocument(bytes, {
      timeoutMs: 20_000,
      maxPages: 20,
    });

    expect(result.totalPages).toBeGreaterThanOrEqual(1);
    expect(result.text.length).toBeGreaterThan(20);
    expect(result.method).not.toBe('no_text_layer');
  });

  it('rejects a non-PDF binary payload', async () => {
    await expect(
      extractPdfDocument(Buffer.from('not a real PDF')),
    ).rejects.toThrow('Invalid PDF signature');
  });
});
