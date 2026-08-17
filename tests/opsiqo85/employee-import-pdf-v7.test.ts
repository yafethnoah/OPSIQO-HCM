import { describe, expect, it } from 'vitest';
import { extractPdfTextLayer } from '@/lib/data-import/pdf-text';
import { parseEmployeeRosterText } from '@/lib/data-import/employee-roster-text';

describe('OPSIQO V7 employee PDF import',()=>{
  it('maps a roster table with full names into employee fields',()=>{
    const parsed=parseEmployeeRosterText('Employee Number | Employee Name | Work Email | Hire Date\nE001 | Jane Doe | jane@example.com | 2026-08-01');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({employeeNumber:'E001',legalFirstName:'Jane',legalLastName:'Doe',workEmail:'jane@example.com',hireDate:'2026-08-01'});
  });
  it('maps labeled employee blocks',()=>{
    const parsed=parseEmployeeRosterText('Employee Name: John Smith\nEmployee Number: E002\nWork Email: john@example.com\nHire Date: 2026-08-02\nDepartment: Finance\nPosition: Analyst');
    expect(parsed.rows[0]).toMatchObject({legalFirstName:'John',legalLastName:'Smith',employeeNumber:'E002',orgUnit:'Finance',position:'Analyst'});
  });
  it('extracts text operators from a machine-readable PDF',()=>{
    const stream='BT\n(Employee Number | Employee Name | Work Email | Hire Date) Tj\nT*\n(E003 | Ana Perez | ana@example.com | 2026-08-03) Tj\nET';
    const pdf=Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Length ${Buffer.byteLength(stream,'latin1')} >>\nstream\n${stream}\nendstream\nendobj\n%%EOF`,'latin1');
    const text=extractPdfTextLayer(pdf);
    expect(text).toContain('Employee Number');
    expect(parseEmployeeRosterText(text).rows[0]).toMatchObject({employeeNumber:'E003',legalFirstName:'Ana',legalLastName:'Perez'});
  });
  it('does not fabricate rows when no employee structure is present',()=>{
    const parsed=parseEmployeeRosterText('General company handbook with no employee roster fields.');
    expect(parsed.rows).toHaveLength(0);
  });
});
