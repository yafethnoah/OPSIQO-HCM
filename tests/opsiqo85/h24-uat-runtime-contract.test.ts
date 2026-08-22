import { describe, expect, it } from 'vitest';
import { employeeCreateSchema } from '@/lib/hr/schemas';
import { createPrehireSchema } from '@/lib/onboarding/schemas';
import { hireConversionSchema } from '@/lib/recruiting/schemas';
import { normalizeRuntimeLocale, runtimeLocaleDirection } from '@/lib/opsiqo-one/runtime-locale';

describe('OPSIQO V7.32 H24 UAT runtime contracts', () => {
  it('normalizes supported locales and makes Arabic RTL', () => {
    expect(normalizeRuntimeLocale('ar-CA')).toBe('ar');
    expect(normalizeRuntimeLocale('fr-CA')).toBe('fr');
    expect(normalizeRuntimeLocale('es')).toBe('es');
    expect(normalizeRuntimeLocale('unknown')).toBe('en');
    expect(runtimeLocaleDirection('ar')).toBe('rtl');
    expect(runtimeLocaleDirection('en')).toBe('ltr');
  });

  it('allows Core HR to assign employee numbers server-side', () => {
    expect(employeeCreateSchema.safeParse({
      legalFirstName: 'Test',
      legalLastName: 'Employee',
      workEmail: 'test.employee@example.com',
      employmentType: 'permanent',
      hireDate: '2026-08-21',
    }).success).toBe(true);
  });

  it('allows recruiting hire conversion to omit employee number', () => {
    expect(hireConversionSchema.safeParse({
      applicationId: 'app-1',
      offerId: 'offer-1',
      workEmail: 'hire@example.com',
      hireDate: '2026-08-21',
      employmentType: 'permanent',
    }).success).toBe(true);
  });

  it('allows prehire creation to defer employee number until activation', () => {
    expect(createPrehireSchema.safeParse({
      offerId: 'offer-1',
      workEmail: 'prehire@example.com',
      employmentType: 'permanent',
      accessDays: 30,
    }).success).toBe(true);
  });
});
