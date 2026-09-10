import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  normalizeResumeLanguages,
  normalizeResumeSkills,
} from '../src/lib/recruiting/resume-semantic-reconstruction';
import { deterministicStructuredResume } from '../src/lib/recruiting/resume-structure';

const read = (path: string) => fs.readFileSync(path, 'utf8');

describe('OPSIQO H51.21 AI resume semantic reconstruction', () => {
  it('reconstructs source-backed fragmented multi-word skills without merging separate skills', () => {
    const source = [
      'SKILLS',
      'Stakeholder',
      'Engagement',
      'Board/Committee',
      'Support',
      'Excel',
      'PowerPoint',
    ].join('\n');

    expect(
      normalizeResumeSkills(
        ['Stakeholder', 'Engagement', 'Board/Committee', 'Support', 'Excel', 'PowerPoint'],
        source,
      ),
    ).toEqual([
      'Stakeholder Engagement',
      'Board/Committee Support',
      'Excel',
      'PowerPoint',
    ]);
  });

  it('keeps complete competency phrases and deduplicates case-insensitively', () => {
    const source = 'SKILLS\nChange Management\nHR Strategy\n';
    expect(
      normalizeResumeSkills(
        ['Change Management', 'change management', 'HR Strategy'],
        source,
      ),
    ).toEqual(['Change Management', 'HR Strategy']);
  });

  it('separates language proficiency from the language name', () => {
    const languages = normalizeResumeLanguages([
      { language: 'Arabic (Native)' },
      { language: 'English (Fluent)' },
      { language: 'Russian - Professional working proficiency' },
    ]);

    expect(languages).toEqual([
      { language: 'Arabic', proficiency: 'Native' },
      { language: 'English', proficiency: 'Fluent' },
      { language: 'Russian', proficiency: 'Professional working proficiency' },
    ]);
  });

  it('normalizes deterministic language records from resume text', () => {
    const source = 'LANGUAGES\nArabic (Native)\nEnglish (Fluent)\n';
    const structured = deterministicStructuredResume({
      sourceText: source,
      skills: [],
      certifications: [],
    });

    expect(structured.languages).toEqual([
      { language: 'Arabic', proficiency: 'Native' },
      { language: 'English', proficiency: 'Fluent' },
    ]);
  });

  it('preserves non-Latin Unicode skill evidence', () => {
    const source = 'SKILLS\n\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629\n\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a\n';
    expect(
      normalizeResumeSkills(
        [
          '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629',
          '\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a',
        ],
        source,
      ),
    ).toEqual([
      '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629',
      '\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a',
    ]);
  });

  it('uses a third governed AI semantic repair pass against the original resume evidence', () => {
    const provider = read('src/lib/recruiting/ats-provider.ts');
    expect(provider).toContain('PASS 3 - semantic reconstruction and completeness repair');
    expect(provider).toContain('governed_ai_semantic_repair');
    expect(provider).toContain('Stakeholder + Engagement => Stakeholder Engagement');
    expect(provider).toContain('Arabic (Native) must become language=Arabic and proficiency=Native');
    expect(provider).toContain("const attachment=input.bytes?.length&&['application/pdf','image/png','image/jpeg'].includes(input.mimeType)?input:undefined");
  });

  it('renders skills compactly and exposes explicit AI improvement actions', () => {
    const portal = read('src/components/candidate-application-portal.tsx');
    const recruiter = read('src/components/resume-intake-assistant.tsx');

    expect(portal).toContain('data-h51-21-skill-editor="true"');
    expect(portal).toContain('AI-normalized competency phrases');
    expect(portal).toContain('Improve parsing with AI');
    expect(recruiter).toContain('Improve with AI');
  });
});
