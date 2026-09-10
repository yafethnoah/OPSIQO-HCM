import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  extractPdfDocument,
} from '@/lib/data-import/pdf-engine';
import {
  parseEmployeeRosterText,
} from '@/lib/data-import/employee-roster-text';

describe('OPSIQO V7 employee PDF import', () => {
  it('maps a roster table with full names into employee fields', () => {
    const parsed = parseEmployeeRosterText(
      'Employee Number | Employee Name | Work Email | Hire Date\n' +
      'E001 | Jane Doe | jane@example.com | 2026-08-01',
    );

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      employeeNumber: 'E001',
      legalFirstName: 'Jane',
      legalLastName: 'Doe',
      workEmail: 'jane@example.com',
      hireDate: '2026-08-01',
    });
  });

  it('maps labeled employee blocks', () => {
    const parsed = parseEmployeeRosterText(
      'Employee Name: John Smith\n' +
      'Employee Number: E002\n' +
      'Work Email: john@example.com\n' +
      'Hire Date: 2026-08-02\n' +
      'Department: Finance\n' +
      'Position: Analyst',
    );

    expect(parsed.rows[0]).toMatchObject({
      legalFirstName: 'John',
      legalLastName: 'Smith',
      employeeNumber: 'E002',
      orgUnit: 'Finance',
      position: 'Analyst',
    });
  });

  it('uses the shared PDF.js engine for real PDF documents', async () => {
    const providerSource = fs.readFileSync(
      'src/lib/recruiting/ats-provider.ts',
      'utf8',
    );

    const match =
      /RECRUITING_DOCUMENT_PROBE_PDF_B64='([^']+)'/
        .exec(providerSource);

    expect(match?.[1]).toBeTruthy();

    const result = await extractPdfDocument(
      Buffer.from(match![1]!, 'base64'),
      {
        maxBytes: 10 * 1024 * 1024,
        maxText: 500_000,
      },
    );

    expect(result.totalPages).toBeGreaterThanOrEqual(1);
    expect(result.text.length).toBeGreaterThan(20);
  });

  it('keeps Employee Import wired to the shared PDF.js engine', () => {
    const source = fs.readFileSync(
      'src/lib/data-import/employee-import.ts',
      'utf8',
    );

    expect(source).toContain(
      "import { extractPdfDocument } from './pdf-engine';",
    );

    expect(source).toContain(
      'await extractPdfDocument(bytes)',
    );

    expect(source).not.toContain(
      'extractPdfTextLayer',
    );
  });

  it('does not fabricate rows when no employee structure is present', () => {
    const parsed = parseEmployeeRosterText(
      'General company handbook with no employee roster fields.',
    );

    expect(parsed.rows).toHaveLength(0);
  });
});
