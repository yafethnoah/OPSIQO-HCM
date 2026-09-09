import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('H50.6J platform-wide page experience', () => {
  it('mounts the experience layer on authenticated and public bootstrap surfaces', () => {
    const shell = read('src/components/app-shell.tsx');
    expect(shell).toContain("import { PageExperienceLayer } from '@/components/page-experience-layer';");
    expect(shell).toContain('<PageExperienceLayer publicMode />');
    expect(shell).toContain('<PageExperienceLayer />');
  });

  it('covers all routes through categorized rules plus a general fallback', () => {
    const registry = read('src/lib/experience/page-experience.ts');
    for (const marker of [
      "id: 'auth'", "id: 'start'", "id: 'people'", "id: 'recruiting'", "id: 'onboarding'", "id: 'offboarding'",
      "id: 'time'", "id: 'talent'", "id: 'rewards'", "id: 'workflow'", "id: 'insights'", "id: 'governance'",
      "id: 'casework'", "id: 'imports'", "id: 'ai'", "id: 'admin'", "id: 'general'",
    ]) expect(registry).toContain(marker);
  });

  it('provides guided/expert modes, persisted guide progress, Arabic instructions and accessibility', () => {
    const page = read('src/components/page-experience-layer.tsx');
    expect(page).toContain("'guided' | 'expert'");
    expect(page).toContain('window.localStorage');
    expect(page).toContain("root.lang.toLowerCase().startsWith('ar')");
    expect(page).toContain('role="progressbar"');
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain('minHeight: 44');
    expect(page).toContain('Alt + Shift + G');
  });

  it('gives direct repair guidance without adding direct domain writes', () => {
    const page = read('src/components/page-experience-layer.tsx');
    expect(page).toContain('Help me repair the issue');
    expect(page).toContain('Explain blockers');
    expect(page).toContain('Prepare missing documents');
    expect(page).toContain("getSectionAiAssist(pathname)");
    expect(page).not.toContain('apiFetch(');
    expect(page).not.toContain('firebase/firestore');
  });

  it('opens governed AI with a preview but never auto-executes the prompt', () => {
    const page = read('src/components/page-experience-layer.tsx');
    const ai = read('src/components/contextual-ai-assist.tsx');
    expect(page).toContain("new CustomEvent('opsiqo:ai-assist'");
    expect(page).toContain('Preview before continuing');
    expect(ai).toContain("window.addEventListener('opsiqo:ai-assist'");
    expect(ai).toContain('setOpen(true)');
    expect(ai).toContain('setQuestion(prompt)');
    expect(ai).not.toContain("void ask(prompt); // opsiqo:ai-assist");
  });

  it('preserves H50.6J release identity or a certified successor lineage', () => {
    const identity = read('src/lib/release/identity.ts');
    const activeJ = identity.includes("OPSIQO_PATCH_RELEASE || 'H50.6J'");
    const certifiedSuccessorWithJLineage =
      (identity.includes("OPSIQO_PATCH_RELEASE || 'H50.6K'") || identity.includes("OPSIQO_PATCH_RELEASE || 'H51.1'")) &&
      identity.includes("'H50.6J'");
    expect(activeJ || certifiedSuccessorWithJLineage).toBe(true);
  });
});
