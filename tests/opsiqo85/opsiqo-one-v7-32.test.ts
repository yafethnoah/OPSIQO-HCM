import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import type { ActorContext, Permission } from '@/domain/security';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';

const read = (p: string) => fs.readFileSync(p, 'utf8');
const actor = (role: ActorContext['role'], permissions: Permission[]): ActorContext => ({
  uid: 'u1',
  orgId: 'o1',
  role,
  workerId: 'w1',
  permissions,
});

describe('OPSIQO ONE V7.32 final runtime closure', () => {
  it('keeps consequential action routing ahead of normal routing', () => {
    const s = read('src/lib/opsiqo-one/command-router.ts');
    expect(s.indexOf('for(const item of blockedConsequential)')).toBeLessThan(s.indexOf('for(const item of patterns)'));
  });

  it('blocks common active inflections of consequential separation verbs before normal routing', () => {
    const authorized = actor('org_admin', ['self.read', 'ai.manage', 'workflow.manage']);
    const consequentialCommands = [
      'Build an agent that terminates Ahmed now',
      'Build an agent that is terminating Ahmed',
      'Build an agent that fires Ahmed',
      'Build an agent that is firing Ahmed',
      'Build an agent that dismisses Ahmed',
      'Build an agent that is dismissing Ahmed',
      'Terminate Ahmed now',
      'Fire Ahmed now',
      'Dismiss Ahmed now',
    ];
    for (const command of consequentialCommands) {
      const result = routeOpsiQoCommand(authorized, command);
      expect(result.mode, command).toBe('blocked');
      expect(result.risk, command).toBe('consequential');
      expect(result.href, command).toBe('/separations');
    }

    const descriptiveCommands = [
      'Review the terminated employee documentation',
      'Review the fired employee documentation',
      'Explain the dismissed employee case',
    ];
    for (const command of descriptiveCommands) {
      const result = routeOpsiQoCommand(authorized, command);
      expect(result.risk, command).not.toBe('consequential');
    }
  });


  it('prioritizes explicit Career GPS intent over generic role wording', () => {
    const result = routeOpsiQoCommand(actor('employee', ['self.read', 'career.read']), 'Open my Career GPS for my next role');
    expect(result.href).toBe('/career-gps');
    expect(result.actionLevel).toBe('recommend');
  });

  it('preserves explicit position creation routing after career precedence hardening', () => {
    const result = routeOpsiQoCommand(actor('org_admin', ['self.read', 'positions.manage']), 'Create a new HR Manager position');
    expect(result.href).toBe('/organization');
    expect(result.mode).toBe('prepare');
    expect(result.actionLevel).toBe('prepare');
  });

  it('keeps Safe Execute limited to directly targeted notification-read state', () => {
    const s = read('src/lib/opsiqo-one/safe-execution.ts');
    expect((s.match(/id:'notifications\.mark_visible_read'/g) || []).length).toBe(1);
    expect(s).not.toContain("id:'preference.locale.update'");
  });

  it('uses the V7.32 translation catalog', () => {
    expect(read('src/lib/opsiqo-one/legacy-surface-i18n.ts')).toContain('legacy-surface-translations-v7-32.json');
  });

  it('closes the measured static translation backlog', () => {
    const d = JSON.parse(read('src/generated/opsiqo-v7-32-translation-inventory.json'));
    expect(d.legacyCandidateCountRemaining).toBe(0);
    expect(d.reviewedSourceCandidates).toBe(d.totalSourceCandidates);
  });

  it('keeps technical identifiers outside UI localization', () => {
    const d = JSON.parse(read('docs/OPSIQO_V7_32_NON_TRANSLATABLE_IDENTIFIERS.json'));
    expect(d.identifiers).toContain('x-opsiqo-signature');
    expect(d.identifiers).toContain('OPSIQO_ALLOW_FIRST_ORG_BOOTSTRAP');
  });

  it('keeps production attestation human-gated', () => {
    const s = read('scripts/opsiqo85-v7-32-final-release-attestation.mjs');
    expect(s).toContain('validateHumanSignoff');
    expect(s).toContain('productionDeploymentApproved');
  });

  it('uses one canonical source-certification gate name', () => {
    expect(read('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1')).toContain("Step 'V7.32 Final Runtime Closure audit'");
    expect(read('scripts/opsiqo85-v7-32-deployment-readiness-summary.mjs')).toContain("'V7.32 Final Runtime Closure audit'");
  });

  it('allows only root .env.local as a certification-only overlay while strict audit remains fail-closed', () => {
    const runner = read('RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1');
    const audit = read('scripts/opsiqo-clean-release-audit.mjs');
    expect(runner).toContain('opsiqo-clean-release-audit.mjs --certification-local-env-overlay');
    expect(audit).toContain("allowedCertificationOverlay = '.env.local'");
    expect(audit).toContain("process.argv.includes('--certification-local-env-overlay')");
  });
});
