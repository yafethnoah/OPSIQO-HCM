import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  deterministicStructuredResume,
  sanitizeStructuredResume,
} from '../src/lib/recruiting/resume-structure';

const profile = (sourceText: string) => ({
  sourceText,
  skills: [] as string[],
  certifications: [] as string[],
});

describe('OPSIQO H51.23 PDF resume record integrity', () => {
  it('never turns a responsibility sentence into an employer', () => {
    const source = [
      'PROFESSIONAL EXPERIENCE',
      'Store Manager / Retail Operations & Sales | Brampton, ON',
      'January 2024 - Present',
      'Assisted customers with product selection, answered questions, handled concerns, and created positive shopping experiences.',
      'SKILLS',
      'Customer Service | Retail Operations',
    ].join('\n');

    const parsed = deterministicStructuredResume(profile(source));
    expect(parsed.employmentHistory).toHaveLength(1);
    expect(parsed.employmentHistory[0]?.positionTitle).toBe('Store Manager / Retail Operations & Sales');
    expect(parsed.employmentHistory[0]?.employer).toBe('');
    expect(parsed.employmentHistory[0]?.employer).not.toContain('Assisted customers');
    expect(parsed.employmentHistory[0]?.location).toBe('Brampton, ON');
  });

  it('separates title and employer and ignores PROFESSIONAL EXPERIENCE - CONTINUED', () => {
    const source = [
      'PROFESSIONAL EXPERIENCE',
      'Director of Operations (Founding Leader) | Auranitis Life Line NGO',
      'January 2013 - December 2016',
      'Co-founded the organization and built its operating model.',
      'PROFESSIONAL EXPERIENCE - CONTINUED',
      'Led governance, compliance, programs and operations.',
      'SKILLS',
      'Stakeholder Engagement | Board/Committee Support | Excel | PowerPoint',
    ].join('\n');

    const parsed = deterministicStructuredResume(profile(source));
    expect(parsed.employmentHistory).toHaveLength(1);
    expect(parsed.employmentHistory[0]?.positionTitle).toBe('Director of Operations (Founding Leader)');
    expect(parsed.employmentHistory[0]?.employer).toBe('Auranitis Life Line NGO');
    expect(parsed.employmentHistory[0]?.employer).not.toContain('PROFESSIONAL EXPERIENCE');
    expect(parsed.skills).toEqual([
      'Stakeholder Engagement',
      'Board/Committee Support',
      'Excel',
      'PowerPoint',
    ]);
  });

  it('splits degree, field, institution and dates into pure education fields', () => {
    const source = [
      'EDUCATION',
      "Master's Degree, Pharmaceutical Botany | Voronezh State University, 2001-2003",
      "Bachelor's Degree, Pharmacy | Voronezh State University, 1997-2001",
      'CERTIFICATIONS',
      'CHRE',
      'LANGUAGES',
      'Arabic (Native)',
      'English (Fluent)',
    ].join('\n');

    const parsed = deterministicStructuredResume(profile(source));

    expect(parsed.educationHistory[0]).toMatchObject({
      degree: "Master's Degree",
      fieldOfStudy: 'Pharmaceutical Botany',
      institution: 'Voronezh State University',
      startDate: '2001',
      endDate: '2003',
    });

    expect(parsed.educationHistory[1]).toMatchObject({
      degree: "Bachelor's Degree",
      fieldOfStudy: 'Pharmacy',
      institution: 'Voronezh State University',
      startDate: '1997',
      endDate: '2001',
    });

    expect(parsed.certifications.map((x) => x.name)).toContain('CHRE');
    expect(parsed.languages).toEqual([
      { language: 'Arabic', proficiency: 'Native' },
      { language: 'English', proficiency: 'Fluent' },
    ]);
  });

  it('repairs AI records containing the exact contamination seen in UAT', () => {
    const source = [
      'PROFESSIONAL EXPERIENCE',
      'Director of Operations (Founding Leader) | Auranitis Life Line NGO',
      'January 2013 - December 2016',
      'Co-founded the organization and built its operating model.',
      'PROFESSIONAL EXPERIENCE - CONTINUED',
      'EDUCATION',
      "Master's Degree, Pharmaceutical Botany | Voronezh State University, 2001-2003",
    ].join('\n');

    const safe = sanitizeStructuredResume({
      employmentHistory: [{
        positionTitle: 'Director of Operations (Founding Leader) | Auranitis Life Line NGO',
        employer: 'PROFESSIONAL EXPERIENCE - CONTINUED',
        current: false,
        startDate: 'January 2013',
        endDate: 'December 2016',
        responsibilities: ['Co-founded the organization and built its operating model.'],
      }],
      educationHistory: [{
        degree: "Master's Degree, Pharmaceutical Botany",
        institution: 'Voronezh State University, 2001-2003',
        startDate: '2001',
        endDate: '2003',
      }],
      skills: [],
      certifications: [],
      languages: [],
      projects: [],
      volunteerExperience: [],
      awards: [],
      publications: [],
      additionalInformation: '',
    }, source);

    expect(safe.employmentHistory[0]?.positionTitle).toBe('Director of Operations (Founding Leader)');
    expect(safe.employmentHistory[0]?.employer).toBe('Auranitis Life Line NGO');
    expect(safe.educationHistory[0]).toMatchObject({
      degree: "Master's Degree",
      fieldOfStudy: 'Pharmaceutical Botany',
      institution: 'Voronezh State University',
    });
  });

  it('splits comma-delimited skills without globally splitting comma-bearing metadata', () => {
    const source = [
      'SKILLS',
      'Pharmacy Operations; Procurement | Vendor Management • Team Leadership, Inventory Control',
      'CERTIFICATIONS',
      'CHRE, HRPA',
      'LANGUAGES',
      'Arabic (Native)',
    ].join('\n');

    const parsed = deterministicStructuredResume(profile(source));

    expect(parsed.skills).toEqual(expect.arrayContaining([
      'Pharmacy Operations',
      'Procurement',
      'Vendor Management',
      'Team Leadership',
      'Inventory Control',
    ]));
    expect(parsed.certifications[0]?.name).toBe('CHRE, HRPA');
    expect(parsed.languages).toEqual([
      { language: 'Arabic', proficiency: 'Native' },
    ]);
  });

  it('keeps original PDF.js text authoritative when usable instead of replacing it with AI evidenceText', () => {
    const provider = fs.readFileSync('src/lib/recruiting/ats-provider.ts', 'utf8');
    expect(provider).toContain("const sourceEvidence=String(text||'')");
    expect(provider).toContain("const aiEvidenceText=raw?.evidenceText");
    expect(provider).toContain("const evidenceText=sourceEvidence||aiEvidenceText");
    expect(provider).toContain('RECRUITING_RESUME_PARSE_V12_RECORD_GRAPH_TRANSACTIONAL_REPAIR');
    const intelligence = fs.readFileSync(
      'src/lib/recruiting/resume-document-intelligence.ts',
      'utf8',
    );
    expect(intelligence).toContain(
      'if (native && native.score >= NATIVE_AUTHORITY_SCORE) return native;',
    );
  });
});
