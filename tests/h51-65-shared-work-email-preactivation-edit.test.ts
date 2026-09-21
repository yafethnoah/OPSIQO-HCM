import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  addWorkEmailOwner,
  removeWorkEmailOwner,
  workEmailOwnerIds,
} from '@/lib/hr/work-email-index';

const read = (path: string) => readFileSync(path, 'utf8');

describe('H51.65 shared departmental work email + pre-activation edit', () => {
  it('migrates legacy one-worker email index records into a multi-owner model', () => {
    expect(workEmailOwnerIds({ workerId: 'worker-a' })).toEqual(['worker-a']);
    expect(addWorkEmailOwner({ workerId: 'worker-a' }, 'worker-b')).toEqual([
      'worker-a',
      'worker-b',
    ]);
    expect(
      removeWorkEmailOwner(
        { workerId: 'worker-a', workerIds: ['worker-a', 'worker-b'] },
        'worker-a',
      ),
    ).toEqual(['worker-b']);
  });

  it('does not use work email as recruiting hire identity', () => {
    const recruiting = read('src/lib/recruiting/service.ts');

    expect(recruiting).not.toContain('existingWorkIndex');
    expect(recruiting).not.toContain(
      'Work email is already assigned to another employee.',
    );
    expect(recruiting).toContain(
      'Shared departmental work email is a contact attribute',
    );
    expect(recruiting).toContain('hireConversionIndex');
  });

  it('allows employee creation with a shared email while keeping employee number unique', () => {
    const hr = read('src/lib/hr/service.ts');

    expect(hr).not.toContain(
      "throw new ApiError(409, 'Work email already exists.', 'duplicate_work_email')",
    );
    expect(hr).toContain('addWorkEmailOwner');
    expect(hr).toContain('removeWorkEmailOwner');
    expect(hr).toContain('shared: owners.length > 1');
    expect(hr).toContain("'duplicate_employee_number'");
  });

  it('preserves safe ambiguous-email behavior for Pulse identity recovery', () => {
    const auth = read('src/lib/auth/session.ts');

    expect(auth).toContain('if (membership.workerId) return membership.workerId');
    expect(auth).toContain('lowerSnap.size === 1');
    expect(auth).toContain('exactSnap.size === 1');
    expect(auth).toContain('.limit(2)');
  });

  it('adds an audited pre-activation details update action', () => {
    const schemas = read('src/lib/onboarding/schemas.ts');
    const service = read('src/lib/onboarding/service.ts');

    expect(schemas).toContain("'update_details'");
    expect(service).toContain("action:'onboarding.update_details'");
    expect(service).toContain("'onboarding.details_updated'");
    expect(service).toContain("patch.workEmail=input.workEmail.trim().toLowerCase()");
    expect(service).toContain('patch.employmentType=input.employmentType');
  });

  it('exposes Edit pre-activation details in the onboarding workspace', () => {
    const workspace = read('src/components/onboarding-workspace.tsx');

    expect(workspace).toContain('Edit pre-activation details');
    expect(workspace).toContain('Save changes');
    expect(workspace).toContain('Pre-activation details');
    expect(workspace).toContain('Shared departmental work email is allowed');
    expect(workspace).toContain("action:'update_details'");
  });

  it('preserves ready-for-activation evidence when details are edited', () => {
    const service = read('src/lib/onboarding/service.ts');

    expect(service).toContain(
      "if(!['in_progress','ready_for_activation'].includes(c.status))",
    );
    expect(service).toContain('batch.set(ref,patch,{merge:true})');
    expect(service).not.toContain("patch.status='in_progress'");
  });
  it('registers onboarding.details_updated as a governed workflow trigger', () => {
    const workflow = read('src/domain/workflow.ts');

    expect(workflow).toContain("'onboarding.details_updated'");
  });
});