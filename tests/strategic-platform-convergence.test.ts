import { describe, expect, it } from 'vitest';
import {
  phaseCapability,
  platformCapabilityConvergence,
  platformConvergenceSummary,
} from '../src/lib/strategic/platform-convergence';
import {
  strategicReadinessSnapshot,
} from '../src/lib/strategic/readiness';

describe('H49 platform capability convergence', () => {
  it('tracks every platform phase covered by the convergence catalog exactly once', () => {
    const ids = platformCapabilityConvergence.map((phase) => phase.phaseId);

    expect(ids).toEqual([
      8, 9, 10, 11, 15, 16, 17, 19, 20, 21, 22, 23, 24,
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps launch, zero-config, unified UX and proactive human ops validated', () => {
    for (const phaseId of [8, 9, 10, 11] as const) {
      expect(phaseCapability(phaseId)?.status).toBe('validated');
    }
  });

  it('keeps integration fabric and marketplace validated', () => {
    expect(phaseCapability(15)?.status).toBe('validated');
    expect(phaseCapability(16)?.status).toBe('validated');
  });

  it('closes the AI HR Process Generator with governed draft-only compilation', () => {
    const phase = phaseCapability(17);

    expect(phase?.status).toBe('validated');
    expect(
      phase?.capabilitySurfaces.some((surface) =>
        surface.includes('hr-process-generator'),
      ),
    ).toBe(true);
  });

  it('keeps explainability, security, reliability and mobile validated', () => {
    for (const phaseId of [19, 20, 21, 22] as const) {
      expect(phaseCapability(phaseId)?.status).toBe('validated');
    }
  });

  it('closes Voice HR while retaining the no-direct-execution control', () => {
    const phase = phaseCapability(23);

    expect(phase?.status).toBe('validated');
    expect(
      phase?.controls.some((control) =>
        control.includes('never performs direct authoritative execution'),
      ),
    ).toBe(true);
  });

  it('keeps the permanent benchmark suite validated', () => {
    expect(phaseCapability(24)?.status).toBe('validated');
  });

  it('reports all platform convergence items validated locally', () => {
    const summary = platformConvergenceSummary();

    expect(summary.total).toBe(13);
    expect(summary.validated).toBe(13);
    expect(summary.partial).toBe(0);
    expect(summary.open).toBe(0);
  });

  it('reports every strategic roadmap phase validated locally but zero UAT verified', () => {
    const snapshot = strategicReadinessSnapshot();

    expect(snapshot.totalPhases).toBe(24);
    expect(snapshot.domainIntegratedOrBetter).toBe(24);
    expect(snapshot.validatedOrBetter).toBe(24);
    expect(snapshot.uatVerified).toBe(0);
  });

  it('validates EOG and Knowledge Graph only after runtime adoption evidence exists', () => {
    const snapshot = strategicReadinessSnapshot();

    expect(
      snapshot.phases.find((phase) => phase.id === 1)?.state,
    ).toBe('validated');

    expect(
      snapshot.phases.find((phase) => phase.id === 2)?.state,
    ).toBe('validated');
  });
});
