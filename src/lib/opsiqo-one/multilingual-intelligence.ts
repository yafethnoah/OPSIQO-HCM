import type { OpsiQoLocale } from '@/domain/opsiqo-one-v7-14';

const names: Record<OpsiQoLocale, string> = {
  auto: 'the language used by the user',
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  ar: 'Arabic',
};

export function aiLanguageInstruction(locale: OpsiQoLocale): string {
  const target = names[locale] || names.auto;
  return `Respond in ${target}. Preserve canonical evidence IDs, codes, names, numbers, dates and source-language quotations exactly when accuracy depends on them. Do not translate an identifier into a different identifier. If a source is in another language, clearly distinguish source text from any translation or summary.`;
}

export function htmlDirection(locale: OpsiQoLocale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
