import { describe, expect, it } from 'vitest';
import { deterministicUniversalImportAnalysis } from '../../src/lib/data-import/universal-parser';

describe('OPSIQO universal HR import parser v2', () => {
  it('classifies and maps policy metadata and sections', () => {
    const text = `Attendance Policy\nPolicy Code: HR-ATT-01\nVersion: 2.1\nEffective Date: 2026-01-01\nOwner: Human Resources\nPURPOSE\nTo define attendance expectations for employees.\nSCOPE\nAll employees.\nRESPONSIBILITIES\nManagers review attendance exceptions.`;
    const a = deterministicUniversalImportAnalysis({ name: 'Attendance_Policy.txt', bytes: Buffer.from(text) });
    expect(a.detectedKind).toBe('policy');
    expect(a.fields.some(f => f.targetField === 'version' && String(f.value) === '2.1')).toBe(true);
    expect(a.sections.some(s => /purpose/i.test(s.name))).toBe(true);
    expect(a.humanReviewRequired).toBe(true);
  });

  it('extracts ordered procedure steps without auto-executing them', () => {
    const text = `Employee Onboarding Procedure\nPurpose\nDefine the onboarding process.\nProcedure\n1. HR verifies the approved hire.\n2. HR creates the employee record.\n3. The manager confirms the onboarding checklist.`;
    const a = deterministicUniversalImportAnalysis({ name: 'Employee_Onboarding_Procedure.txt', bytes: Buffer.from(text) });
    expect(a.detectedKind).toBe('procedure');
    expect(a.steps.map(s => s.order)).toEqual([1, 2, 3]);
    expect(a.targetModule).toMatch(/Process Library/i);
    expect(a.humanReviewRequired).toBe(true);
  });

  it('detects reusable digital-form field proposals', () => {
    const text = `Leave Request Form\nEmployee Name: ___\nEmployee Email: ___\nRequest Date: ___\nReason: ___\nManager Approval: ___\nSignature: ___`;
    const a = deterministicUniversalImportAnalysis({ name: 'Leave_Request_Form.txt', bytes: Buffer.from(text) });
    expect(a.detectedKind).toBe('form');
    expect(a.formFields.length).toBeGreaterThanOrEqual(4);
    expect(a.formFields.some(f => f.type === 'email')).toBe(true);
    expect(a.formFields.some(f => f.type === 'approval')).toBe(true);
    expect(a.formFields.some(f => f.type === 'signature')).toBe(true);
  });

  it('classifies a job description and extracts structured recruiting sections', () => {
    const text = `HR Manager Job Description\nResponsibilities\nLead employee relations and recruitment.\nRequirements\n5 years of HR experience required.\nCHRL certification required.\nReports To\nExecutive Director`;
    const a = deterministicUniversalImportAnalysis({ name: 'HR_Manager_Job_Description.txt', bytes: Buffer.from(text) });
    expect(a.detectedKind).toBe('job_description');
    expect(a.fields.some(f => f.targetField === 'requirements')).toBe(true);
    expect(a.targetModule).toMatch(/Recruiting/i);
  });

  it('maps common employee-roster columns to Core HR fields', () => {
    const csv = `Employee ID,First Name,Last Name,Work Email,Department,Job Title,Manager Email,Start Date
E-100,Ana,Li,ana@example.com,HR,HR Generalist,boss@example.com,2026-01-15`;
    const a = deterministicUniversalImportAnalysis({ name: 'Employee_Master_Roster.csv', bytes: Buffer.from(csv) });
    expect(a.detectedKind).toBe('employee_roster');
    const mapped = new Set(a.fields.map(f => f.targetField));
    expect(mapped.has('employeeNumber')).toBe(true);
    expect(mapped.has('legalFirstName')).toBe(true);
    expect(mapped.has('orgUnit')).toBe(true);
    expect(mapped.has('position')).toBe(true);
    expect(mapped.has('manager')).toBe(true);
  });

});
