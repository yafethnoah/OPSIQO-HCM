import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const read = (path: string) =>
  fs.readFileSync(path, 'utf8');

describe('H51.20B2A Universal PDF migration', () => {
  it('routes Universal PDF extraction through the shared PDF.js engine', () => {
    const source = read(
      'src/lib/data-import/universal-parser.ts',
    );

    expect(source).toContain('extractPdfDocument');
    expect(source).toContain('textFromFileAsync');
    expect(source).toContain('analyzeZipAsync');
    expect(source).toContain(
      'deterministicUniversalImportAnalysisAsync',
    );
    expect(source).toContain('extractUniversalTextAsync');

    expect(source).not.toContain(
      'extractPdfTextLayer',
    );
  });

  it('uses asynchronous Universal analysis in the production library workflow', () => {
    const source = read(
      'src/lib/data-import/library-import.ts',
    );

    expect(source).toContain(
      'await deterministicUniversalImportAnalysisAsync(',
    );

    expect(source).toContain(
      'await extractUniversalTextAsync(',
    );

    expect(source).not.toContain(
      'base=deterministicUniversalImportAnalysis(',
    );

    expect(source).not.toContain(
      'text=extractUniversalText(',
    );
  });

  it('keeps human review mandatory', () => {
    const source = read(
      'src/lib/data-import/universal-parser.ts',
    );

    expect(source).toContain(
      'humanReviewRequired: true',
    );
  });
});
