import type { ResumeLanguageEntry } from '@/domain/structured-resume';

const SKILL_CONTINUATIONS = new Set([
  'management',
  'engagement',
  'support',
  'planning',
  'development',
  'relations',
  'analytics',
  'analysis',
  'strategy',
  'governance',
  'compliance',
  'controls',
  'control',
  'reporting',
  'coordination',
  'administration',
  'operations',
  'transformation',
  'improvement',
  'optimization',
  'acquisition',
  'recruitment',
  'recruiting',
  'intelligence',
  'assurance',
  'oversight',
  'integration',
  'implementation',
  'delivery',
]);

const SKILL_FRAGMENT_STOPWORDS = new Set([
  'board',
  'committee',
  'department',
  'organization',
  'organisation',
  'company',
  'foundation',
  'association',
  'society',
  'team',
  'staff',
  'office',
  'unit',
  'division',
]);

const PROFICIENCY_LABELS: Array<[RegExp, string]> = [
  [/^native(?:\s+speaker)?$/iu, 'Native'],
  [/^(?:native\s+or\s+)?bilingual$/iu, 'Bilingual'],
  [/^fluent$/iu, 'Fluent'],
  [/^full\s+professional(?:\s+proficiency)?$/iu, 'Full professional proficiency'],
  [/^professional\s+working(?:\s+proficiency)?$/iu, 'Professional working proficiency'],
  [/^limited\s+working(?:\s+proficiency)?$/iu, 'Limited working proficiency'],
  [/^elementary(?:\s+proficiency)?$/iu, 'Elementary proficiency'],
  [/^professional$/iu, 'Professional'],
  [/^advanced$/iu, 'Advanced'],
  [/^intermediate$/iu, 'Intermediate'],
  [/^conversational$/iu, 'Conversational'],
  [/^basic$/iu, 'Basic'],
  [/^beginner$/iu, 'Beginner'],
];

function clean(value: unknown, max = 400): string {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);
}

function canonical(value: unknown): string {
  return clean(value, 1000)
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}+#./&-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
}

function sourceContainsWhitespaceJoinedPhrase(left: string, right: string, source: string): boolean {
  const leftPattern = clean(left, 180)
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegex)
    .join('\\s+');

  const rightPattern = clean(right, 180)
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegex)
    .join('\\s+');

  if (!leftPattern || !rightPattern) return false;

  try {
    return new RegExp(`${leftPattern}\\s+${rightPattern}`, 'iu')
      .test(String(source || '').replace(/\u00a0/g, ' '));
  } catch {
    return false;
  }
}

function looksLikeSkillContinuation(left: string, right: string): boolean {
  const words = canonical(right).split(/\s+/).filter(Boolean);
  const first = words[0] || '';
  return (
    SKILL_CONTINUATIONS.has(first) ||
    /[\/&-]\s*$/u.test(left)
  );
}

function shouldMergeSkill(left: string, right: string, source: string): boolean {
  if (!left || !right) return false;
  if (left.length > 120 || right.length > 90) return false;
  if (!looksLikeSkillContinuation(left, right)) return false;
  return sourceContainsWhitespaceJoinedPhrase(left, right, source);
}

export function normalizeResumeSkills(values: unknown[], source = ''): string[] {
  const input = (Array.isArray(values) ? values : [])
    .map((value) => clean(value, 180))
    .filter(Boolean);

  const merged: string[] = [];

  for (let i = 0; i < input.length; i += 1) {
    let value = input[i]!;
    let mergedParts = 0;

    while (
      i + 1 < input.length &&
      mergedParts < 3 &&
      shouldMergeSkill(value, input[i + 1]!, source)
    ) {
      value = `${value} ${input[i + 1]!}`
        .replace(/\s+/g, ' ')
        .trim();
      i += 1;
      mergedParts += 1;
    }

    merged.push(value);
  }

  const seen = new Set<string>();
  return merged.filter((value) => {
    const key = canonical(value);
    const tokens = key.split(/\s+/).filter(Boolean);
    if (!key || seen.has(key)) return false;
    if (tokens.length === 1 && SKILL_FRAGMENT_STOPWORDS.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 200);
}

function normalizeProficiency(value: unknown): string | undefined {
  const raw = clean(value, 120)
    .replace(/^\(+|\)+$/g, '')
    .trim();

  if (!raw) return undefined;

  for (const [pattern, label] of PROFICIENCY_LABELS) {
    if (pattern.test(raw)) return label;
  }

  return raw;
}

function isProficiency(value: string): boolean {
  return PROFICIENCY_LABELS.some(([pattern]) => pattern.test(value.trim()));
}

function splitLanguageValue(value: string): { language: string; proficiency?: string } {
  const raw = clean(value, 180);
  if (!raw) return { language: '' };

  const parenthetical = /^(.+?)\s*\(([^()]+)\)\s*$/u.exec(raw);
  if (parenthetical && isProficiency(parenthetical[2]!)) {
    return {
      language: clean(parenthetical[1], 120),
      proficiency: normalizeProficiency(parenthetical[2]),
    };
  }

  const separated = /^(.+?)\s*(?:[-\u2013\u2014:|])\s*(.+)$/u.exec(raw);
  if (separated && isProficiency(separated[2]!)) {
    return {
      language: clean(separated[1], 120),
      proficiency: normalizeProficiency(separated[2]),
    };
  }

  const trailing = /^(.+?)\s+(Native|Bilingual|Fluent|Professional|Advanced|Intermediate|Conversational|Basic|Beginner)$/iu.exec(raw);
  if (trailing) {
    return {
      language: clean(trailing[1], 120),
      proficiency: normalizeProficiency(trailing[2]),
    };
  }

  return { language: clean(raw, 120) };
}

export function normalizeResumeLanguages(
  values: Array<Partial<ResumeLanguageEntry> | string>,
  _source = '',
): ResumeLanguageEntry[] {
  const out: ResumeLanguageEntry[] = [];

  for (const value of Array.isArray(values) ? values : []) {
    const rawLanguage = typeof value === 'string'
      ? value
      : clean(value?.language, 180);

    const parsed = splitLanguageValue(rawLanguage);
    if (!parsed.language) continue;

    const explicit = typeof value === 'string'
      ? undefined
      : normalizeProficiency(value?.proficiency);

    out.push({
      ...(typeof value === 'string' ? {} : value),
      language: parsed.language,
      proficiency: explicit || parsed.proficiency,
    });
  }

  const indexByLanguage = new Map<string, number>();
  const deduped: ResumeLanguageEntry[] = [];

  for (const item of out) {
    const key = canonical(item.language);
    if (!key) continue;

    const existingIndex = indexByLanguage.get(key);
    if (existingIndex == null) {
      indexByLanguage.set(key, deduped.length);
      deduped.push(item);
      continue;
    }

    const existing = deduped[existingIndex]!;
    if (!existing.proficiency && item.proficiency) {
      deduped[existingIndex] = { ...existing, proficiency: item.proficiency };
    }
  }

  return deduped.slice(0, 40);
}
