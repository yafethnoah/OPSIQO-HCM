import { describe, expect, it } from 'vitest';
import {
  SCORE_METHODOLOGY,
  capabilityPresentation,
  countryPackCertification,
  displayPhaseName,
} from '@/lib/strategic/five-phase-presentation';

describe('H51.39 strategic trust UX', () => {
  it('renames phase 2 as GCC Platform Readiness so it is not presented as compliance certification', () => {
    expect(displayPhaseName({ id: 2, name: 'GCC Dominance' })).toBe('GCC Platform Readiness');
    expect(displayPhaseName({ id: 3, name: 'Workforce Intelligence' })).toBe('Workforce Intelligence');
  });

  it('labels incomplete Saudi/UAE packs as NOT CERTIFIED', () => {
    const state = countryPackCertification({
      country: 'SA',
      name: 'Saudi Arabia',
      version: '0.1.0',
      status: 'draft',
      officialSources: [],
    });
    expect(state.label).toBe('NOT CERTIFIED');
    expect(state.evidenceComplete).toBe(0);
    expect(state.evidenceRequired).toBe(6);
  });

  it('requires an active pack and complete evidence before displaying evidence-gated active', () => {
    const state = countryPackCertification({
      country: 'AE',
      name: 'United Arab Emirates',
      version: '1.0.0',
      status: 'active',
      officialSources: ['official-source-ref'],
      statutoryRuleSetRef: 'rules-v1',
      legalReviewRef: 'legal-review',
      payrollValidationRef: 'payroll-validation',
      goldenTestEvidenceRef: 'golden-tests',
      arabicQaEvidenceRef: 'rtl-qa',
    });
    expect(state.label).toBe('EVIDENCE-GATED PACK ACTIVE');
    expect(state.evidenceComplete).toBe(6);
  });

  it('provides direct next actions for the biggest missing capabilities', () => {
    expect(capabilityPresentation('ksa')).toEqual(expect.objectContaining({ targetTab: 'gcc' }));
    expect(capabilityPresentation('uae')).toEqual(expect.objectContaining({ targetTab: 'gcc' }));
    expect(capabilityPresentation('kill-switch')).toEqual(expect.objectContaining({ targetTab: 'agents' }));
    expect(capabilityPresentation('developer')).toEqual(expect.objectContaining({ href: '/integrations' }));
    expect(capabilityPresentation('trust')).toEqual(expect.objectContaining({ href: '/governance' }));
  });

  it('explicitly separates implementation scoring from certification', () => {
    expect(SCORE_METHODOLOGY).toContain('Implementation score only');
    expect(SCORE_METHODOLOGY).toContain('not regulatory certification');
    expect(SCORE_METHODOLOGY).toContain('not legal advice');
  });
});