import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const read = (path: string) =>
  fs.readFileSync(path, 'utf8');

describe('H51.20B2B Recruiting PDF migration', () => {
  it('uses the shared PDF.js engine for Recruiting', () => {
    const source = read(
      'src/lib/recruiting/ats-service.ts',
    );

    expect(source).toContain(
      'extractPdfDocument',
    );

    expect(source).toContain(
      'assessPdfTextQuality',
    );

    expect(source).toContain(
      'async function textFromResume',
    );

    expect(source).toContain(
      'async function pdfTextLayerState',
    );

    expect(
      source.match(
        /await textFromResume\(file\.name, bytes\)/g,
      )?.length,
    ).toBe(3);

    expect(source).toContain(
      'extractResumeDocumentEvidence',
    );

    expect(source).toContain(
      'const pdfLayerState = await pdfTextLayerState(',
    );
  });

  it('passes original Recruiting document bytes to governed AI', () => {
    const service = read(
      'src/lib/recruiting/ats-service.ts',
    );

    expect(service).toMatch(
      /governedResumeParse[\s\S]{0,400}bytes,[\s\S]{0,200}text,/,
    );

    expect(service).toMatch(
      /governedJobDescriptionParse[\s\S]{0,400}bytes,[\s\S]{0,200}text,/,
    );
  });

  it('keeps Gemini and OpenAI native PDF attachment support', () => {
    const provider = read(
      'src/lib/recruiting/ats-provider.ts',
    );

    expect(provider).toMatch(
      /const attachment=input\.bytes\?\.length&&\['application\/pdf','image\/png','image\/jpeg'\]\.includes\(input\.mimeType\)\?input:undefined/,
    );

    expect(provider).toMatch(
      /inlineData:\{mimeType:file\.mimeType,data:file\.bytes\.toString\('base64'\)\}/,
    );

    expect(provider).toMatch(
      /type:'input_file',filename:file\.name,file_data:file\.bytes\.toString\('base64'\)/,
    );
  });

  it('preserves independent second-pass verification', () => {
    const provider = read(
      'src/lib/recruiting/ats-provider.ts',
    );

    expect(provider).toContain(
      'PASS 2 - independently verify and correct the candidate extraction against the resume evidence.',
    );

    expect(provider).toContain(
      'PASS 2 - independently verify and correct the job-posting extraction.',
    );
  });

  it('keeps the four production PDF consumers on the shared architecture', () => {
    const files = [
      'src/lib/recruiting/ats-service.ts',
      'src/lib/data-import/employee-import.ts',
      'src/lib/data-import/universal-parser.ts',
      'src/lib/contract-import/service.ts',
    ];

    for (const path of files) {
      const source = read(path);

      expect(source).not.toMatch(
        /from\s+["'][^"']*pdf-text["']/,
      );

      expect(source).not.toMatch(
        /\bextractPdfTextLayer\s*\(/,
      );

      expect(source).not.toMatch(
        /\bassessHumanReadableText\s*\(/,
      );
    }
  });
});
