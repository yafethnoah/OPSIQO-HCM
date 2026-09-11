import type { ParsedResumeProfile } from '@/domain/ats';
import type {
  StructuredResumeProfile,
  ResumeEmploymentEntry,
  ResumeEducationEntry,
} from '@/domain/structured-resume';
import { normalizeResumeLanguages, normalizeResumeSkills } from './resume-semantic-reconstruction';

export interface StructuredResumeAssessment {
  quality: number;
  coverage: number;
  recordCount: number;
  issues: string[];
  criticalIssues: string[];
}

const ALL_HEADINGS = new Set([
  'professional summary','summary','profile','professional profile',
  'professional experience','work experience','experience','employment history','career history',
  'skills','technical skills','core competencies','competencies','expertise','core skills','key skills','professional skills','professional competencies','technical competencies','core capabilities','executive capabilities','core executive capabilities','core executive & hr capabilities','areas of expertise','hr systems & process improvement','technology & digital transformation','technology and digital transformation',
  'education','education & credentials','education and credentials','education & training','education and training','academic credentials','academic background','academic qualifications','qualifications',
  'certifications','certificates','licences','licenses','credentials','professional certifications','certifications & credentials','certifications and credentials',
  'languages','language skills','projects','selected projects','key projects',
  'volunteer experience','volunteering','community experience','community involvement',
  'awards','honours','honors','achievements','publications','presentations',
  'additional information','professional affiliations','memberships','interests',
]);

const EXPERIENCE_HEADINGS = ['professional experience','work experience','experience','employment history','career history'];
const EDUCATION_HEADINGS = ['education','education & credentials','education and credentials','education & training','education and training','academic credentials','academic background','academic qualifications','qualifications'];
const SKILLS_HEADINGS = ['skills','technical skills','core competencies','competencies','expertise','core skills','key skills','professional skills','professional competencies','technical competencies','core capabilities','executive capabilities','core executive capabilities','core executive & hr capabilities','areas of expertise','hr systems & process improvement','technology & digital transformation','technology and digital transformation'];
const CERTIFICATION_HEADINGS = ['certifications','certificates','licences','licenses','credentials','professional certifications','certifications & credentials','certifications and credentials'];
const LANGUAGE_HEADINGS = ['languages','language skills'];

const DEGREE_HINT = /\b(?:bachelor(?:['’]s)?|bachelor\s+of\s+pharmacy|b\.?\s*pharm\.?|bpharm|master(?:['’]s)?|doctor(?:ate|al)?|doctor\s+of\s+pharmacy|pharm\.?\s*d\.?|pharmd|ph\.?d\.?|mba|m\.?sc\.?|b\.?sc\.?|b\.?a\.?|b\.?s\.?|m\.?a\.?|m\.?s\.?|diploma|degree|post[- ]?graduate|graduate certificate)\b/i;
const INSTITUTION_HINT = /\b(?:university|college|institute|school|academy|polytechnic|faculty|conservatory)\b/i;
const TITLE_HINT = /\b(?:chief|ceo|president|vice president|vp|director|manager|specialist|officer|coordinator|advisor|adviser|consultant|partner|lead|head|supervisor|analyst|generalist|pharmacist|engineer|developer|administrator|executive|founder|co-founder)\b/i;
const ROLE_DESCRIPTOR = /^(?:founding leader|founder|co-founder|team leader|project leader|executive leader|senior leader|department head|board member|consultant|advisor|adviser)$/i;
const ACTION_SENTENCE = /^(?:assessed|analyzed|analysed|built|created|delivered|designed|developed|directed|drove|established|evaluated|expanded|implemented|improved|increased|launched|led|managed|negotiated|oversaw|prepared|reduced|restructured|supported|trained|transformed|updated|worked|coordinated|conducted|administered|achieved|maintained|monitored|introduced|streamlined|supervised)\b/i;
const DATE_TOKEN = /\b(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(?:19|20)\d{2}\b/i;
const DATE_RANGE = new RegExp(`${DATE_TOKEN.source}\\s*(?:-|–|—|to)\\s*(?:(?:present|current|now)|${DATE_TOKEN.source})`, 'i');
const LOCATION_HINT = /(?:,\s*[A-Z]{2}\b)|\b(?:ontario|canada|jordan|syria|damascus|amman|toronto|mississauga|ottawa|montreal|vancouver|remote|hybrid)\b/i;

function clean(v: unknown, max = 5000): string {
  return String(v ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);
}

function cleanHeading(v: string) {
  return clean(v, 160)
    .toLowerCase()
    .replace(/^\s*page\s+\d+(?:\s+of\s+\d+)?\s*[-–—|:]\s*/i, '')
    .replace(/\s*(?:[-–—|:])\s*(?:continued|cont\.?)\s*$/i, '')
    .replace(/[:|]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isStructuralNoise(v: string) {
  const raw = clean(v, 220);
  const heading = cleanHeading(raw);
  if (!raw) return true;
  if (ALL_HEADINGS.has(heading)) return true;
  if (/^page\s+\d+(?:\s+of\s+\d+)?$/i.test(raw)) return true;
  if (/\b(?:professional\s+experience|work\s+experience|education|skills|core\s+competencies|certifications?|languages?)\b.*\b(?:continued|cont\.?)\b/i.test(raw)) return true;
  return false;
}

function looksLikeResponsibilitySentence(v: string) {
  const value = stripBullet(clean(v, 1200));
  if (!value) return false;
  if (ACTION_SENTENCE.test(value)) return true;
  if (/^(?:assisted|answered|handled|served|processed|scheduled|collaborated|facilitated|provided|resolved|organized|organised|performed|ensured|promoted|advised|partnered)\b/i.test(value)) return true;
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length >= 5 && /[.!?]$/.test(value)) return true;
  return words.length >= 10 && /[,;.!?]/.test(value);
}

function stripBullet(v: string) {
  return clean(v, 1200).replace(/^[•·▪◦‣●○►▸*\-]+\s*/u, '').trim();
}

function escapeResumeRegex(value: string) {
  return value.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
}

function normalizeSectionLayout(source: string) {
  const headings = [...ALL_HEADINGS].sort((a, b) => b.length - a.length);
  const sourceLines = String(source || '').replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];

  for (const rawLine of sourceLines) {
    const line = String(rawLine || '');

    if (!line) {
      lines.push(line);
      continue;
    }

    const directHeading = cleanHeading(line);

    // Exact headings and continuation headings must never be fragmented by a
    // shorter nested heading such as CREDENTIALS or EXPERIENCE.
    if (ALL_HEADINGS.has(directHeading) || isStructuralNoise(line)) {
      lines.push(line);
      continue;
    }

    let bestIndex = -1;
    let bestUpper = '';

    for (const heading of headings) {
      const upper = heading.toUpperCase();
      const index = line.indexOf(upper);
      if (index < 0) continue;

      if (
        bestIndex < 0 ||
        index < bestIndex ||
        (index === bestIndex && upper.length > bestUpper.length)
      ) {
        bestIndex = index;
        bestUpper = upper;
      }
    }

    if (bestIndex < 0) {
      lines.push(line);
      continue;
    }

    const before = line.slice(0, bestIndex).trimEnd();
    const after = line.slice(bestIndex + bestUpper.length);

    if (before) lines.push(before);

    // Keep page continuation labels whole so cleanHeading/isStructuralNoise
    // can suppress them rather than turning them into fake records.
    if (/^\s*(?:[-–—|:])\s*(?:continued|cont\.?)\s*$/i.test(after)) {
      lines.push(`${bestUpper}${after}`);
      continue;
    }

    lines.push(bestUpper);

    if (after.trim()) {
      lines.push(after.trimStart());
    }
  }

  return lines
    .join('\n')
    .replace(/([.!?])([•·▪◦‣●○►▸])/gu, '$1\n$2')
    .replace(/([A-Za-z])((?:19|20)\d{2}\b)/g, '$1\n$2');
}

function sectionBody(source: string, aliases: string[]): string {
  const lines = normalizeSectionLayout(source).split('\n');
  const wanted = new Set(aliases.map(cleanHeading));
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (wanted.has(cleanHeading(lines[i] || ''))) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return '';
  const out: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const raw = lines[i] || '';
    const heading = cleanHeading(raw);
    if (wanted.has(heading)) continue;
    if (ALL_HEADINGS.has(heading)) break;
    if (isStructuralNoise(raw)) continue;
    out.push(raw);
  }
  return out.join('\n').trim();
}

function normalizeEvidence(v: string) {
  return clean(v, 500000).toLocaleLowerCase().replace(/[^\p{L}\p{N}+#.]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

function supported(value: unknown, source: string, threshold = 0.68): string | undefined {
  const text = clean(value, 5000);
  if (!text) return undefined;
  const src = normalizeEvidence(source);
  const exact = normalizeEvidence(text);
  if (exact.length >= 3 && src.includes(exact)) return text;
  const words = exact.match(/[\p{L}\p{N}+#.]{2,}/gu) || [];
  if (!words.length) return undefined;
  const unique = [...new Set(words)];
  const hit = unique.filter((w) => src.includes(w)).length;
  return hit / unique.length >= threshold ? text : undefined;
}

function indexOfEvidence(value: string, source: string) {
  const needle = normalizeEvidence(value);
  if (!needle) return -1;
  return normalizeEvidence(source).indexOf(needle);
}

function coLocated(a: string | undefined, b: string | undefined, source: string, maxDistance = 900) {
  if (!a || !b) return false;
  const ai = indexOfEvidence(a, source);
  const bi = indexOfEvidence(b, source);
  return ai >= 0 && bi >= 0 && Math.abs(ai - bi) <= maxDistance;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((v) => clean(v, 400)).filter(Boolean))];
}

function splitParts(line: string) {
  return line
    .split(/\s*(?:\||•|—|–)\s*|\s+-\s+/)
    .map((v) => clean(v, 400))
    .filter(Boolean);
}

function splitEducationDegree(value: string) {
  const text = clean(value, 420);
  const parts = text.split(/\s*,\s*/).map((v) => clean(v, 240)).filter(Boolean);
  const institutionIndex = parts.findIndex((part) => INSTITUTION_HINT.test(part));
  const degreeParts = institutionIndex > 0 ? parts.slice(0, institutionIndex) : parts;
  const candidate = degreeParts.join(', ') || text;

  const formalOfDegree = candidate.match(
    /^((?:Bachelor|Master|Doctor)\s+of\s+(.+))$/i,
  );

  if (formalOfDegree) {
    return {
      degree: clean(formalOfDegree[1], 220),
      fieldOfStudy: clean(formalOfDegree[2], 240),
    };
  }

  const inline = candidate.match(
    /^((?:bachelor(?:['’]s)?|master(?:['’]s)?|doctoral|doctorate|ph\.?d\.?|mba|m\.?sc\.?|b\.?sc\.?|b\.?a\.?|b\.?s\.?|m\.?a\.?|m\.?s\.?)\s*(?:degree)?)(?:\s+(?:in|of)\s+)(.+)$/i,
  );

  if (inline) {
    return {
      degree: clean(inline[1], 220),
      fieldOfStudy: clean(inline[2], 240),
    };
  }

  if (degreeParts.length >= 2 && DEGREE_HINT.test(degreeParts[0]!) && !DATE_TOKEN.test(degreeParts[1]!)) {
    return {
      degree: degreeParts[0]!,
      fieldOfStudy: degreeParts.slice(1).join(', '),
    };
  }

  return {
    degree: institutionIndex > 0 ? degreeParts[0] || text : text,
    fieldOfStudy: undefined as string | undefined,
  };
}

function splitInstitutionMeta(value: string) {
  let text = clean(value, 520);
  let dateText: string | undefined;
  let location: string | undefined;

  const commaParts = text.split(/\s*,\s*/).map((v) => clean(v, 260)).filter(Boolean);
  const institutionIndex = commaParts.findIndex((part) => INSTITUTION_HINT.test(part));

  if (institutionIndex >= 0) {
    const institutionParts = [commaParts[institutionIndex]!];
    let cursor = institutionIndex + 1;

    while (cursor < commaParts.length && INSTITUTION_HINT.test(commaParts[cursor]!)) {
      institutionParts.push(commaParts[cursor]!);
      cursor += 1;
    }

    text = institutionParts.join(', ');

    for (const part of commaParts.slice(cursor)) {
      const range = part.match(DATE_RANGE)?.[0];
      const token = part.match(DATE_TOKEN)?.[0];
      if (!dateText && (range || token)) dateText = range || token;
      else if (!location && LOCATION_HINT.test(part)) location = part;
    }
  } else {
    const range = text.match(DATE_RANGE)?.[0];
    const token = text.match(DATE_TOKEN)?.[0];

    if (range || token) {
      dateText = range || token;
      const idx = text.toLowerCase().lastIndexOf(String(dateText).toLowerCase());
      if (idx >= 0 && idx + String(dateText).length >= text.length - 2) {
        text = text.slice(0, idx).replace(/[\s,;|·•-]+$/u, '').trim();
      }
    }

    text = text
      .replace(/\s*\((?:in\s+progress|expected|anticipated)[^)]*\)?\s*$/i, '')
      .trim();

    const remaining = text.split(/\s*,\s*/).filter(Boolean);
    if (remaining.length >= 2) {
      const tail = remaining[remaining.length - 1]!;
      if (LOCATION_HINT.test(tail) && !INSTITUTION_HINT.test(tail)) {
        location = tail;
        text = remaining.slice(0, -1).join(', ');
      }
    }
  }

  return {
    institution: clean(text, 280),
    dateText,
    location,
  };
}

function parseEducation(source: string): ResumeEducationEntry[] {
  const body = sectionBody(source, EDUCATION_HEADINGS);
  if (!body) return [];
  const lines = body.split('\n').map((v) => clean(v, 700)).filter(Boolean);
  const out: ResumeEducationEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (ACTION_SENTENCE.test(stripBullet(line)) && !DEGREE_HINT.test(stripBullet(line))) continue;

    const parts = splitParts(line);
    let degree = '';
    let institution = '';
    let fieldOfStudy: string | undefined;
    let dateText: string | undefined = line.match(DATE_RANGE)?.[0];

    if (parts.length >= 2) {
      const degreeIndex = parts.findIndex((p) => DEGREE_HINT.test(p));
      const institutionIndex = parts.findIndex((p) => INSTITUTION_HINT.test(p));
      if (degreeIndex >= 0) degree = parts[degreeIndex]!;
      if (institutionIndex >= 0) institution = parts[institutionIndex]!;
      if (degreeIndex >= 0 && institutionIndex >= 0) {
        const between = parts.filter((_, idx) => idx !== degreeIndex && idx !== institutionIndex && !DATE_TOKEN.test(parts[idx]!));
        fieldOfStudy = between[0];
      }
      dateText ||= parts.flatMap((p) => [p.match(DATE_RANGE)?.[0] || p.match(DATE_TOKEN)?.[0]]).find(Boolean);
    }

    if (!degree && DEGREE_HINT.test(line)) degree = line;
    if (!institution && INSTITUTION_HINT.test(line)) institution = line;

    if (degree && !institution) {
      for (let j = i + 1; j <= Math.min(i + 2, lines.length - 1); j++) {
        const candidate = lines[j]!;
        if (INSTITUTION_HINT.test(candidate) && !ACTION_SENTENCE.test(candidate)) {
          institution = candidate;
          if (j === i + 2 && lines[i + 1] && !DATE_TOKEN.test(lines[i + 1]!) && !ACTION_SENTENCE.test(lines[i + 1]!)) {
            fieldOfStudy = lines[i + 1]!;
          }
          break;
        }
      }
    }

    const degreeMeta = splitEducationDegree(degree);
    degree = degreeMeta.degree;
    if (!fieldOfStudy && degreeMeta.fieldOfStudy) fieldOfStudy = degreeMeta.fieldOfStudy;

    const institutionMeta = splitInstitutionMeta(institution);
    institution = institutionMeta.institution;
    if (!dateText && institutionMeta.dateText) dateText = institutionMeta.dateText;

    if (!degree || !institution) continue;
    if (looksLikeResponsibilitySentence(degree) || looksLikeResponsibilitySentence(institution)) continue;
    if (isStructuralNoise(degree) || isStructuralNoise(institution)) continue;

    const record: ResumeEducationEntry = {
      degree: clean(degree, 260),
      institution: clean(institution, 280),
    };
    if (institutionMeta.location) record.location = clean(institutionMeta.location, 180);
    if (fieldOfStudy && !INSTITUTION_HINT.test(fieldOfStudy) && !ACTION_SENTENCE.test(fieldOfStudy)) {
      record.fieldOfStudy = clean(fieldOfStudy, 260);
    }
    if (dateText) {
      const m = dateText.match(DATE_RANGE);
      if (m) {
        const [start, end] = m[0].split(/\s*(?:-|–|—|to)\s*/i);
        record.startDate = clean(start, 80);
        record.endDate = clean(end, 80);
      } else {
        record.graduationDate = clean(dateText, 80);
      }
    }
    out.push(record);
  }

  return dedupeEducation(out).slice(0, 40);
}

function dedupeEducation(items: ResumeEducationEntry[]) {
  const seen = new Set<string>();
  return items.filter((x) => {
    const key = `${cleanHeading(x.degree)}|${cleanHeading(x.institution)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function employerCandidate(line: string) {
  const value = clean(line, 260);
  const lexical = stripBullet(value);
  if (!lexical || isStructuralNoise(lexical)) return false;
  if (DATE_TOKEN.test(lexical) || LOCATION_HINT.test(lexical) || looksLikeResponsibilitySentence(lexical)) return false;
  if (ROLE_DESCRIPTOR.test(lexical)) return false;
  if (TITLE_HINT.test(lexical) && lexical.split(/\s+/).length <= 8) return false;
  const words = lexical.split(/\s+/).filter(Boolean);
  if (words.length >= 5 && /[.!?]$/.test(lexical)) return false;
  return lexical.length <= 140;
}

function titleCandidate(line: string) {
  const value = clean(line, 240);
  return Boolean(
    value &&
    !isStructuralNoise(value) &&
    TITLE_HINT.test(value) &&
    !looksLikeResponsibilitySentence(value) &&
    !DATE_TOKEN.test(value)
  );
}

function parseEmploymentBlock(lines: string[]): ResumeEmploymentEntry | null {
  const values = lines.map((v) => clean(v, 1200)).filter(Boolean);
  if (!values.length) return null;

  let positionTitle = '';
  let employer = '';
  let startDate: string | undefined;
  let endDate: string | undefined;
  let current = false;
  let location: string | undefined;

  const dateIndex = values.findIndex((v) => DATE_RANGE.test(v));
  if (dateIndex >= 0) {
    const match = values[dateIndex]!.match(DATE_RANGE)?.[0] || '';
    const parts = match.split(/\s*(?:-|–|—|to)\s*/i);
    startDate = clean(parts[0], 80) || undefined;
    endDate = clean(parts[1], 80) || undefined;
    current = /present|current|now/i.test(endDate || '');
    if (current) endDate = undefined;
  }

  const metaEnd = dateIndex >= 0 ? dateIndex : Math.min(values.length, 4);
  const metadata = values.slice(0, metaEnd).filter((v) => !isStructuralNoise(v));
  const metadataParts = metadata
    .flatMap((v) => splitParts(v))
    .map((v) => stripBullet(v))
    .filter((v) => v && !isStructuralNoise(v));

  positionTitle = metadataParts.find(titleCandidate) || '';
  const titleIndex = metadataParts.indexOf(positionTitle);
  const employerPool = metadataParts.filter((v, idx) => idx !== titleIndex);
  employer = stripBullet(employerPool.find(employerCandidate) || '');

  if (!positionTitle && values[0]) {
    const firstParts = splitParts(values[0]).filter((v) => !isStructuralNoise(v));
    positionTitle = firstParts.find(titleCandidate) || '';
  }

  if (!employer && positionTitle) {
    const rawTitleParts = splitParts(values[0] || '').filter((v) => !isStructuralNoise(v));
    employer = stripBullet(rawTitleParts.find((v) => employerCandidate(v)) || '');
  }

  const dateLineLocationParts = dateIndex >= 0
    ? splitParts(values[dateIndex] || '').filter((v) => LOCATION_HINT.test(v) && !DATE_TOKEN.test(v))
    : [];
  const locationLine =
    metadataParts.find((v) => LOCATION_HINT.test(v) && !looksLikeResponsibilitySentence(v)) ||
    dateLineLocationParts[0] ||
    values.find((v, idx) => idx !== dateIndex && LOCATION_HINT.test(v) && !looksLikeResponsibilitySentence(v));
  if (locationLine) location = clean(locationLine, 240);

  const responsibilities = values
    .slice(dateIndex >= 0 ? dateIndex + 1 : Math.min(metadata.length, 3))
    .filter((v) => !isStructuralNoise(v))
    .filter((v) => looksLikeResponsibilitySentence(v) || /^[•·▪◦‣●○►▸*-]/u.test(v))
    .map((v) => v.replace(/^[•·▪◦*-]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 40);

  if (!positionTitle && !employer) return null;
  return { positionTitle, employer, current, startDate, endDate, location, responsibilities };
}

function parseEmployment(source: string): ResumeEmploymentEntry[] {
  const body = sectionBody(source, EXPERIENCE_HEADINGS);
  if (!body) return [];
  const rawBlocks = body.split(/\n\s*\n+/).map((b) => b.split('\n').filter((v) => clean(v))).filter((b) => b.length);

  let blocks = rawBlocks;
  if (blocks.length <= 1) {
    const lines = body.split('\n').map((v) => clean(v, 1200)).filter(Boolean);
    blocks = [];
    let current: string[] = [];
    for (const line of lines) {
      if (DATE_RANGE.test(line) && current.length >= 1) {
        current.push(line);
        blocks.push(current);
        current = [];
      } else if (blocks.length && current.length === 0 && ACTION_SENTENCE.test(stripBullet(line))) {
        blocks[blocks.length - 1]!.push(line);
      } else {
        current.push(line);
      }
    }
    if (current.length >= 2) blocks.push(current);
  }

  const out = blocks.map(parseEmploymentBlock).filter((x): x is ResumeEmploymentEntry => Boolean(x));
  const seen = new Set<string>();
  return out.filter((x) => {
    const key = `${cleanHeading(x.positionTitle)}|${cleanHeading(x.employer)}|${cleanHeading(x.startDate || '')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 60);
}

function sectionLines(source: string, headings: string[], max: number, splitCommas = false) {
  const delimiter = splitCommas
    ? /\n|;|,|\||•|·|▪|◦|‣|●|○|►|▸/u
    : /\n|;|\||•|·|▪|◦|‣|●|○|►|▸/u;

  return uniqueStrings(
    sectionBody(source, headings)
      .split(delimiter)
      .map((v) => v.replace(/^[•·▪◦*-]\s*/, '').trim())
      .filter((v) => v && !ACTION_SENTENCE.test(v)),
  ).slice(0, max);
}

function inlineLanguageSignals(source: string) {
  const values: string[] = [];
  const proficiency = 'Native|Bilingual|Fluent|Professional(?:[\\t ]+working(?:[\\t ]+proficiency)?)?|Full[\\t ]+professional(?:[\\t ]+proficiency)?|Limited[\\t ]+working(?:[\\t ]+proficiency)?|Advanced|Intermediate|Conversational|Basic|Beginner';

  // Double-quoted source string is intentional: it safely supports both
  // straight and curly apostrophes inside language names without ending
  // the TypeScript string literal.
  const pattern = new RegExp(
    "(?:^|[\\n|,;•·])[\\t ]*([\\p{L}][\\p{L}\\p{M}'’.-]*(?:[\\t ]+[\\p{L}][\\p{L}\\p{M}'’.-]*)?)[\\t ]*(?:\\((" + proficiency + ")\\)|[-–—:][\\t ]*(" + proficiency + "))",
    'gimu',
  );

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(String(source || '')))) {
    const language = clean(match[1], 120);
    const level = clean(match[2] || match[3], 120);

    if (
      language &&
      level &&
      !/^(?:language|languages|skills|technical)$/i.test(language) &&
      !language.includes('\n')
    ) {
      values.push(`${language} (${level})`);
    }
  }

  return uniqueStrings(values).slice(0, 40);
}

export function deterministicStructuredResume(profile: Pick<ParsedResumeProfile, 'sourceText'|'skills'|'certifications'>): StructuredResumeProfile {
  const source = String(profile.sourceText || '');
  const skillsFromSection = sectionLines(source, SKILLS_HEADINGS, 200, true);
  const certificationsFromSection = sectionLines(source, CERTIFICATION_HEADINGS, 60);
  const languages = normalizeResumeLanguages(
    [
      ...sectionLines(source, LANGUAGE_HEADINGS, 40),
      ...inlineLanguageSignals(source),
    ],
    source,
  );

  return {
    employmentHistory: parseEmployment(source),
    educationHistory: parseEducation(source),
    skills: normalizeResumeSkills([...(skillsFromSection.length ? skillsFromSection : profile.skills || [])], source),
    certifications: uniqueStrings([...(certificationsFromSection.length ? certificationsFromSection : profile.certifications || [])])
      .map((name) => ({ name }))
      .slice(0, 60),
    languages,
    projects: [],
    volunteerExperience: [],
    awards: [],
    publications: [],
    additionalInformation: '',
  };
}

function safeEmployment(items: StructuredResumeProfile['employmentHistory'], source: string) {
  return (items || []).flatMap((raw) => {
    const titleParts = splitParts(String(raw.positionTitle || ''))
      .map((v) => stripBullet(v))
      .filter((v) => v && !isStructuralNoise(v));

    const rawLocationParts = splitParts(String(raw.location || ''))
      .map((v) => stripBullet(v))
      .filter((v) => v && !isStructuralNoise(v));
    const locationEmployer = rawLocationParts.find(employerCandidate);
    const locationPlace = rawLocationParts.find((v) => LOCATION_HINT.test(v) && !employerCandidate(v));

    const titleSeed = titleParts.find(titleCandidate) || String(raw.positionTitle || '');
    const employerSeed =
      (employerCandidate(String(raw.employer || '')) ? String(raw.employer || '') : '') ||
      titleParts.find(employerCandidate) ||
      locationEmployer ||
      '';

    const positionTitle = supported(titleSeed, source, 0.72) || '';
    let employer = supported(employerSeed, source, 0.72) || '';
    if (
      ROLE_DESCRIPTOR.test(stripBullet(employer)) ||
      looksLikeResponsibilitySentence(employer) ||
      isStructuralNoise(employer)
    ) employer = '';
    if (positionTitle && employer && !coLocated(positionTitle, employer, source, 1300)) employer = '';
    const responsibilities = (raw.responsibilities || [])
      .flatMap((v) => {
        const x = supported(v, source, 0.68);
        return x ? [x] : [];
      })
      .slice(0, 40);
    if (!positionTitle && !employer) return [];
    return [{
      ...raw,
      positionTitle,
      employer,
      startDate: supported(raw.startDate, source, 0.7),
      endDate: supported(raw.endDate, source, 0.7),
      location: supported(locationPlace || raw.location, source, 0.7),
      city: supported(raw.city, source, 0.7),
      region: supported(raw.region, source, 0.7),
      country: supported(raw.country, source, 0.7),
      responsibilities,
      reasonForLeaving: supported(raw.reasonForLeaving, source, 0.8),
    }];
  });
}

function safeEducation(items: StructuredResumeProfile['educationHistory'], source: string) {
  return (items || []).flatMap((raw) => {
    const degreeMeta = splitEducationDegree(String(raw.degree || ''));
    const institutionMeta = splitInstitutionMeta(String(raw.institution || ''));

    let degree = supported(degreeMeta.degree, source, 0.72) || '';
    let institution = supported(institutionMeta.institution, source, 0.72) || '';
    let fieldOfStudy = supported(raw.fieldOfStudy || degreeMeta.fieldOfStudy, source, 0.72);
    if (ACTION_SENTENCE.test(stripBullet(degree)) && !DEGREE_HINT.test(stripBullet(degree))) degree = '';
    if (ACTION_SENTENCE.test(stripBullet(institution))) institution = '';
    if (degree && institution && !coLocated(degree, institution, source, 1000)) institution = '';
    if (!degree && !institution) return [];
    return [{
      ...raw,
      degree,
      institution,
      fieldOfStudy,
      startDate: supported(raw.startDate || institutionMeta.dateText?.match(DATE_RANGE)?.[0]?.split(/\s*(?:-|–|—|to)\s*/i)[0], source, 0.7),
      endDate: supported(raw.endDate || institutionMeta.dateText?.match(DATE_RANGE)?.[0]?.split(/\s*(?:-|–|—|to)\s*/i)[1], source, 0.7),
      graduationDate: supported(raw.graduationDate, source, 0.7),
      location: supported(raw.location || institutionMeta.location, source, 0.7),
    }];
  });
}

export function sanitizeStructuredResume(input: StructuredResumeProfile, source: string): StructuredResumeProfile {
  const safeSimple = <T extends object, K extends keyof T>(items: T[], anchor: K, max: number): T[] =>
    (items || []).filter((item) => Boolean(supported(item[anchor] as unknown, source, 0.68))).slice(0, max);

  return {
    employmentHistory: safeEmployment(input.employmentHistory || [], source),
    educationHistory: safeEducation(input.educationHistory || [], source),
    skills: normalizeResumeSkills(
      (input.skills || []).flatMap((v) => supported(v, source, 0.65) ? [v] : []),
      source,
    ),
    certifications: safeSimple(input.certifications || [], 'name', 60),
    languages: normalizeResumeLanguages(
      (input.languages || []).flatMap((raw) => {
        const normalized = normalizeResumeLanguages([raw], source)[0];
        if (!normalized) return [];
        const language = supported(normalized.language, source, 0.68);
        if (!language) return [];
        const proficiency = normalized.proficiency
          ? supported(normalized.proficiency, source, 0.55)
          : undefined;
        return [{ ...normalized, language, proficiency }];
      }),
      source,
    ),
    projects: safeSimple(input.projects || [], 'name', 50),
    volunteerExperience: safeSimple(input.volunteerExperience || [], 'organization', 50),
    awards: safeSimple(input.awards || [], 'title', 50),
    publications: safeSimple(input.publications || [], 'title', 50),
    additionalInformation: supported(input.additionalInformation, source, 0.65),
  };
}

function canonicalRecordValue(value: unknown) {
  return clean(value, 500)
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function recordYear(value: unknown) {
  return clean(value, 100).match(/\b(?:19|20)\d{2}\b/)?.[0] || '';
}

function sameEmploymentRecord(a: ResumeEmploymentEntry, b: ResumeEmploymentEntry) {
  const employerA = canonicalRecordValue(a.employer);
  const employerB = canonicalRecordValue(b.employer);
  const titleA = canonicalRecordValue(a.positionTitle);
  const titleB = canonicalRecordValue(b.positionTitle);
  const startA = recordYear(a.startDate);
  const startB = recordYear(b.startDate);

  const employerSame = Boolean(employerA && employerB && employerA === employerB);
  const titleSame = Boolean(titleA && titleB && titleA === titleB);
  const startSame = Boolean(startA && startB && startA === startB);

  if (employerSame && titleSame) return true;
  if (employerSame && startSame) return true;
  if (titleSame && startSame) return true;
  if (employerSame && (!a.positionTitle || !b.positionTitle) && (!startA || !startB)) return true;
  return false;
}

function mergeEmploymentPair(primary: ResumeEmploymentEntry, fallback: ResumeEmploymentEntry) {
  const deterministicComplete = Boolean(fallback.positionTitle && fallback.employer);
  const anchor = deterministicComplete ? fallback : primary;
  const secondary = deterministicComplete ? primary : fallback;

  return {
    ...secondary,
    ...anchor,
    positionTitle: anchor.positionTitle || secondary.positionTitle,
    employer: anchor.employer || secondary.employer,
    current: Boolean(anchor.current || secondary.current),
    startDate: anchor.startDate || secondary.startDate,
    endDate: anchor.endDate || secondary.endDate,
    location: anchor.location || secondary.location,
    city: anchor.city || secondary.city,
    region: anchor.region || secondary.region,
    country: anchor.country || secondary.country,
    responsibilities: uniqueStrings([
      ...(anchor.responsibilities || []),
      ...(secondary.responsibilities || []),
    ]).slice(0, 60),
    reasonForLeaving: anchor.reasonForLeaving || secondary.reasonForLeaving,
  } satisfies ResumeEmploymentEntry;
}

function reconcileEmploymentRecords(
  primary: StructuredResumeProfile['employmentHistory'] | undefined,
  fallback: StructuredResumeProfile['employmentHistory'],
  source: string,
) {
  const p = safeEmployment(primary || [], source);
  const f = safeEmployment(fallback || [], source);
  const out = [...f];

  for (const record of p) {
    const index = out.findIndex((candidate) => sameEmploymentRecord(record, candidate));

    if (index >= 0) {
      out[index] = mergeEmploymentPair(record, out[index]!);
      continue;
    }

    // A new AI-only employment record needs both semantic anchors. Partial
    // records stay unresolved rather than becoming false employment cards.
    if (record.positionTitle && record.employer) out.push(record);
  }

  return safeEmployment(out, source);
}

function sameEducationRecord(a: ResumeEducationEntry, b: ResumeEducationEntry) {
  const institutionA = canonicalRecordValue(a.institution);
  const institutionB = canonicalRecordValue(b.institution);
  const degreeA = canonicalRecordValue(a.degree);
  const degreeB = canonicalRecordValue(b.degree);
  const yearA = recordYear(a.startDate || a.endDate || a.graduationDate);
  const yearB = recordYear(b.startDate || b.endDate || b.graduationDate);

  const institutionSame = Boolean(institutionA && institutionB && institutionA === institutionB);
  const degreeSame = Boolean(degreeA && degreeB && degreeA === degreeB);
  const yearSame = Boolean(yearA && yearB && yearA === yearB);

  return (institutionSame && degreeSame) ||
    (institutionSame && yearSame) ||
    (degreeSame && yearSame);
}

function mergeEducationPair(primary: ResumeEducationEntry, fallback: ResumeEducationEntry) {
  const deterministicComplete = Boolean(fallback.degree && fallback.institution);
  const anchor = deterministicComplete ? fallback : primary;
  const secondary = deterministicComplete ? primary : fallback;

  return {
    ...secondary,
    ...anchor,
    degree: anchor.degree || secondary.degree,
    fieldOfStudy: anchor.fieldOfStudy || secondary.fieldOfStudy,
    institution: anchor.institution || secondary.institution,
    startDate: anchor.startDate || secondary.startDate,
    endDate: anchor.endDate || secondary.endDate,
    graduationDate: anchor.graduationDate || secondary.graduationDate,
    completed: anchor.completed ?? secondary.completed,
    location: anchor.location || secondary.location,
  } satisfies ResumeEducationEntry;
}

function reconcileEducationRecords(
  primary: StructuredResumeProfile['educationHistory'] | undefined,
  fallback: StructuredResumeProfile['educationHistory'],
  source: string,
) {
  const p = safeEducation(primary || [], source);
  const f = safeEducation(fallback || [], source);
  const out = [...f];

  for (const record of p) {
    const index = out.findIndex((candidate) => sameEducationRecord(record, candidate));

    if (index >= 0) {
      out[index] = mergeEducationPair(record, out[index]!);
      continue;
    }

    if (record.degree && record.institution) out.push(record);
  }

  return safeEducation(out, source);
}

function mergeCertifications(
  primary: StructuredResumeProfile['certifications'] | undefined,
  fallback: StructuredResumeProfile['certifications'],
) {
  const seen = new Set<string>();
  return [...(primary || []), ...(fallback || [])].filter((record) => {
    const key = `${canonicalRecordValue(record.name)}|${canonicalRecordValue(record.issuer)}`;
    if (!canonicalRecordValue(record.name) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeStructuredResume(
  primary: StructuredResumeProfile | undefined,
  fallback: StructuredResumeProfile,
  source: string,
): StructuredResumeProfile {
  const p = primary ? sanitizeStructuredResume(primary, source) : undefined;
  const f = sanitizeStructuredResume(fallback, source);
  const choose = <T>(a: T[] | undefined, b: T[]) => a && a.length ? a : b;

  return sanitizeStructuredResume({
    employmentHistory: reconcileEmploymentRecords(p?.employmentHistory, f.employmentHistory, source),
    educationHistory: reconcileEducationRecords(p?.educationHistory, f.educationHistory, source),
    skills: normalizeResumeSkills([...(p?.skills || []), ...f.skills], source),
    certifications: mergeCertifications(p?.certifications, f.certifications),
    languages: normalizeResumeLanguages([...(p?.languages || []), ...f.languages], source),
    projects: choose(p?.projects, f.projects),
    volunteerExperience: choose(p?.volunteerExperience, f.volunteerExperience),
    awards: choose(p?.awards, f.awards),
    publications: choose(p?.publications, f.publications),
    additionalInformation: p?.additionalInformation || f.additionalInformation,
  }, source);
}

function categoryHints(source: string) {
  const headingSet = new Set(
    normalizeSectionLayout(source)
      .split('\n')
      .map(cleanHeading)
      .filter(Boolean),
  );

  const hasHeading = (headings: string[]) =>
    headings.some((h) => headingSet.has(cleanHeading(h)));
  return {
    employmentHistory: hasHeading(EXPERIENCE_HEADINGS),
    educationHistory: hasHeading(EDUCATION_HEADINGS),
    skills: hasHeading(SKILLS_HEADINGS),
    certifications: hasHeading(CERTIFICATION_HEADINGS),
    languages: hasHeading(LANGUAGE_HEADINGS),
  };
}

export function assessStructuredResume(input: StructuredResumeProfile, source: string): StructuredResumeAssessment {
  const sr = sanitizeStructuredResume(input, source);
  const issues: string[] = [];
  const criticalIssues: string[] = [];
  const scores: number[] = [];

  for (const [i, x] of sr.employmentHistory.entries()) {
    let score = 0;
    if (x.positionTitle) score += 20; else criticalIssues.push(`Employment ${i + 1}: position title unresolved.`);
    if (x.employer) score += 25; else criticalIssues.push(`Employment ${i + 1}: employer unresolved.`);
    if (x.current || x.startDate || x.endDate) score += 15; else issues.push(`Employment ${i + 1}: dates need review.`);
    if (x.responsibilities.length) score += 30; else issues.push(`Employment ${i + 1}: responsibilities need review.`);
    if (x.location) score += 5;
    if (x.positionTitle && x.employer && coLocated(x.positionTitle, x.employer, source, 1300)) score += 5;
    scores.push(score);
  }

  for (const [i, x] of sr.educationHistory.entries()) {
    let score = 0;
    if (x.degree) score += 30; else criticalIssues.push(`Education ${i + 1}: degree unresolved.`);
    if (x.institution) score += 35; else criticalIssues.push(`Education ${i + 1}: institution unresolved.`);
    if (x.fieldOfStudy) score += 15; else issues.push(`Education ${i + 1}: field of study needs review.`);
    if (x.startDate || x.endDate || x.graduationDate) score += 10;
    if (x.location) score += 5;
    if (x.degree && x.institution && coLocated(x.degree, x.institution, source, 1000)) score += 5;
    scores.push(score);
  }

  if (sr.skills.length) scores.push(85);
  if (sr.certifications.length) scores.push(85);
  if (sr.languages.length) scores.push(85);
  if (sr.projects.length) scores.push(80);
  if (sr.volunteerExperience.length) scores.push(80);
  if (sr.awards.length) scores.push(80);
  if (sr.publications.length) scores.push(80);

  const hints = categoryHints(source);
  const expected = Object.entries(hints).filter(([, value]) => value);
  const present = expected.filter(([key]) => {
    const value = sr[key as keyof typeof sr];
    return Array.isArray(value) && value.length > 0;
  }).length;
  const coverage = expected.length ? Math.round((present / expected.length) * 99) : (scores.length ? 80 : 0);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const quality = Math.min(99, Math.max(0, Math.round(average * 0.8 + coverage * 0.2)));

  if (hints.employmentHistory && !sr.employmentHistory.length) criticalIssues.push('Experience section detected but no reliable employment records were built.');
  if (hints.educationHistory && !sr.educationHistory.length) criticalIssues.push('Education section detected but no reliable education records were built.');
  if (hints.skills && !sr.skills.length) criticalIssues.push('Skills section detected but no reliable skills were built.');
  if (hints.certifications && !sr.certifications.length) criticalIssues.push('Certification section detected but no reliable certification records were built.');
  if (hints.languages && !sr.languages.length) criticalIssues.push('Language section detected but no reliable language records were built.');

  const recordCount =
    sr.employmentHistory.length + sr.educationHistory.length + sr.skills.length +
    sr.certifications.length + sr.languages.length + sr.projects.length +
    sr.volunteerExperience.length + sr.awards.length + sr.publications.length;

  return {
    quality,
    coverage,
    recordCount,
    issues: [...new Set(issues)].slice(0, 40),
    criticalIssues: [...new Set(criticalIssues)].slice(0, 40),
  };
}


export function deriveStructuredExperienceYears(
  records: StructuredResumeProfile['employmentHistory'],
  now = new Date(),
): number | undefined {
  const months: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  const point = (value: unknown, endBoundary: boolean) => {
    const text = clean(value, 100);
    const yearOnly = text.match(/^((?:19|20)\d{2})$/);

    if (yearOnly) {
      const year = Number(yearOnly[1]);
      return Date.UTC(endBoundary ? year + 1 : year, 0, 1);
    }

    const monthYear = text.match(/^([A-Za-z]{3,9})\s+((?:19|20)\d{2})$/);
    if (monthYear) {
      const month = months[monthYear[1]!.toLowerCase()];
      const year = Number(monthYear[2]);
      if (month == null) return undefined;
      return Date.UTC(year, endBoundary ? month + 1 : month, 1);
    }

    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const intervals = (records || []).flatMap((record) => {
    if (!record.positionTitle || !record.employer || !record.startDate) return [];

    const start = point(record.startDate, false);
    const end = record.current
      ? now.getTime()
      : point(record.endDate, true);

    if (start == null || end == null || end <= start) return [];
    return [[start, end] as [number, number]];
  }).sort((a, b) => a[0] - b[0]);

  if (!intervals.length) return undefined;

  const merged: Array<[number, number]> = [];

  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (!last || interval[0] > last[1]) {
      merged.push([...interval] as [number, number]);
    } else {
      last[1] = Math.max(last[1], interval[1]);
    }
  }

  const totalMs = merged.reduce((sum, [start, end]) => sum + (end - start), 0);
  return Math.round((totalMs / (365.2425 * 24 * 60 * 60 * 1000)) * 10) / 10;
}

export function candidateVerificationGate(input: StructuredResumeProfile, source: string) {
  const assessment = assessStructuredResume(input, source);
  return { ...assessment, canFinalize: assessment.criticalIssues.length === 0 };
}
