import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import runtimeTranslations from '@/lib/opsiqo-one/runtime-ui-translations-v7-32.json';
import { runtimeUiTranslation } from '@/lib/opsiqo-one/runtime-ui-i18n';
import { employeeCreateSchema } from '@/lib/hr/schemas';

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('OPSIQO V7.32 H25 UAT closure contracts', () => {
  it('covers the mixed-language UAT strings in every supported non-English locale', () => {
    const required = [
      'Enterprise HCM Command Center',
      'My Account',
      'Appearance',
      'Authentication & Access',
      'Organization & Region',
      'Import employees into People',
      'AI prepared',
      'Needs me',
      'Transparency',
      'Pay Equity',
      'Architecture',
      'Rewards',
      'Choose employee import file',
      'No file selected',
      'Auto-assigned',
    ];
    const map = runtimeTranslations as Record<string, { fr: string; es: string; ar: string }>;
    expect(Object.keys(map).length).toBeGreaterThanOrEqual(300);
    for (const key of required) {
      expect(map[key], key).toBeTruthy();
      expect(map[key]!.fr.trim(), `${key} fr`).not.toBe('');
      expect(map[key]!.es.trim(), `${key} es`).not.toBe('');
      expect(map[key]!.ar.trim(), `${key} ar`).not.toBe('');
    }
  });

  it('translates exact and placeholder-based runtime UI strings', () => {
    expect(runtimeUiTranslation('My Account', 'ar')).toBe('حسابي');
    const translated = runtimeUiTranslation('2 worker(s) in scope', 'ar');
    expect(translated).toBeTruthy();
    expect(translated).not.toBe('2 worker(s) in scope');
  });

  it('lets employee imports defer employee-number allocation to Core HR', () => {
    const service = read('src/lib/data-import/employee-import.ts');
    expect(service).not.toContain('Employee number is required.');
    expect(service).toContain('Employee number will be assigned automatically.');
    expect(service).toContain('...(r.employeeNumber?{employeeNumber:r.employeeNumber}:{})');
    expect(service).toContain('if(nn)seenNums.add(nn)');
  });

  it('allows employees without a work email while still rejecting malformed supplied emails', () => {
    const base = { legalFirstName: 'No', legalLastName: 'Email', employmentType: 'permanent' as const, hireDate: '2026-08-24' };
    expect(employeeCreateSchema.safeParse(base).success).toBe(true);
    expect(employeeCreateSchema.safeParse({ ...base, workEmail: '' }).success).toBe(true);
    expect(employeeCreateSchema.safeParse({ ...base, workEmail: 'bad-email' }).success).toBe(false);
    const service = read('src/lib/data-import/employee-import.ts');
    expect(service).not.toContain('A valid work email is required.');
    expect(service).toContain('Work email is optional.');
    expect(service).toContain('if(r.workEmail)seenEmails.add(r.workEmail)');
    expect(read('src/lib/hr/service.ts')).toContain('if (emailIndexRef) tx.create(emailIndexRef');
  });

  it('protects authenticated routes and coordinates session-expiry redirects', () => {
    const shell = read('src/components/app-shell.tsx');
    const guard = read('src/lib/auth/authenticated-shell-guard.ts');
    const expiry = read('src/lib/auth/session-expiry-client.ts');
    expect(shell).toContain('useAuthenticatedShellGuard(!publicBootstrap)');
    expect(guard).toContain('reason=authentication_required');
    expect(expiry).toContain('opsiqo.sessionExpiryRedirecting');
  });

  it('preserves H24 employee numbering and dependent-dropdown applicability', () => {
    expect(read('src/lib/hr/service.ts')).toContain('counters/employeeNumber');
    const recruiting = read('src/components/recruiting-workspace.tsx');
    expect(recruiting).toContain('requisitionPositions');
    expect(recruiting).toContain('eligibleWorkers');
    expect(recruiting).toContain('disabled={!acceptedOffers.length}');
    const onboarding = read('src/components/onboarding-workspace.tsx');
    expect(onboarding.includes('acceptedOffers') || onboarding.includes('accepted')).toBe(true);
    expect(onboarding.includes('disabled={!acceptedOffers.length}') || onboarding.includes('disabled={!accepted.length}')).toBe(true);
  });
});
