import { describe, expect, it } from 'vitest';
import {
  backupConfirmationText,
  backupFileName,
  isOrganizationBackupRole,
  sanitizeBackupValue,
} from '../src/lib/admin-maintenance/backup';

describe('H50.2 admin data control', () => {
  it('limits full organization backup to org and super admins', () => {
    expect(isOrganizationBackupRole('org_admin')).toBe(true);
    expect(isOrganizationBackupRole('super_admin')).toBe(true);
    expect(isOrganizationBackupRole('hr_admin')).toBe(false);
    expect(isOrganizationBackupRole('employee')).toBe(false);
  });

  it('creates an explicit organization-name backup confirmation', () => {
    expect(backupConfirmationText('Kris Atelier')).toBe(
      'BACKUP KRIS ATELIER',
    );
  });

  it('creates a filesystem-safe backup filename', () => {
    expect(
      backupFileName(
        'Kris Atelier / Canada',
        '2026-09-07T12:00:00.000Z',
      ),
    ).toBe('OPSIQO_Kris_Atelier_Canada_Backup_2026-09-07.jsonl.gz');
  });

  it('redacts credential-like fields while preserving HR data', () => {
    const state = { redactions: 0 };
    const result = sanitizeBackupValue(
      {
        displayName: 'Example Employee',
        workEmail: 'employee@example.org',
        apiKey: 'must-not-export',
        nested: {
          clientSecret: 'must-not-export',
          department: 'Operations',
        },
      },
      state,
    ) as any;

    expect(result.displayName).toBe('Example Employee');
    expect(result.workEmail).toBe('employee@example.org');
    expect(result.nested.department).toBe('Operations');
    expect(result.apiKey.__redacted).toBe(true);
    expect(result.nested.clientSecret.__redacted).toBe(true);
    expect(state.redactions).toBe(2);
  });
});
