import runtimeTranslations from './runtime-ui-translations-v7-32.json';
import type { ShellLocale } from './shell-i18n';

export type RuntimeUiTranslation = { fr: string; es: string; ar: string };

type PatternTranslation = {
  source: string;
  names: string[];
  regex: RegExp;
  translated: RuntimeUiTranslation;
};

const exact = new Map<string, RuntimeUiTranslation>();
const patterns: PatternTranslation[] = [];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileTemplate(source: string, translated: RuntimeUiTranslation): PatternTranslation | null {
  const placeholder = /\{([A-Za-z0-9_]+)\}/g;
  const names: string[] = [];
  let cursor = 0;
  let pattern = '^';
  let match: RegExpExecArray | null;
  while ((match = placeholder.exec(source))) {
    pattern += escapeRegex(source.slice(cursor, match.index));
    names.push(match[1]!);
    pattern += '(.+?)';
    cursor = match.index + match[0].length;
  }
  if (!names.length) return null;
  pattern += escapeRegex(source.slice(cursor));
  pattern += '$';
  return { source, names, regex: new RegExp(pattern), translated };
}

for (const [source, value] of Object.entries(runtimeTranslations as Record<string, RuntimeUiTranslation>)) {
  const compiled = compileTemplate(source, value);
  if (compiled) patterns.push(compiled);
  else exact.set(source, value);
}

function substitute(template: string, names: string[], values: string[]): string {
  let output = template;
  names.forEach((name, index) => {
    output = output.replaceAll(`{${name}}`, values[index] ?? '');
  });
  return output;
}

export function runtimeUiTranslation(source: string, locale: ShellLocale): string | undefined {
  if (locale === 'en') return source;
  const direct = exact.get(source);
  if (direct) return direct[locale];

  for (const pattern of patterns) {
    const match = pattern.regex.exec(source);
    if (!match) continue;
    return substitute(pattern.translated[locale], pattern.names, match.slice(1));
  }
  return undefined;
}

export function hasRuntimeUiTranslation(source: string): boolean {
  if (exact.has(source)) return true;
  return patterns.some((pattern) => pattern.regex.test(source));
}

export const RUNTIME_UI_TRANSLATION_COUNT = Object.keys(runtimeTranslations).length;
export const RUNTIME_UI_PATTERN_COUNT = patterns.length;
