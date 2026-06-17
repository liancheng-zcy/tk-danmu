import type { CommonLanguageId, TranslatorProviderId } from './protocol';

const PROMPT_LABELS: Record<CommonLanguageId, string> = {
  auto: 'Auto Detect',
  'zh-CN': 'Simplified Chinese',
  'zh-TW': 'Traditional Chinese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ru: 'Russian',
  pt: 'Portuguese',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  ar: 'Arabic'
};

const ALIYUN_MAP: Record<Exclude<CommonLanguageId, 'auto'>, string> = {
  'zh-CN': 'zh',
  'zh-TW': 'zh-tw',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  fr: 'fr',
  de: 'de',
  ru: 'ru',
  pt: 'pt',
  vi: 'vi',
  th: 'th',
  id: 'id',
  ar: 'ar'
};

const MICROSOFT_MAP: Record<Exclude<CommonLanguageId, 'auto'>, string> = {
  'zh-CN': 'zh-Hans',
  'zh-TW': 'zh-Hant',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  fr: 'fr',
  de: 'de',
  ru: 'ru',
  pt: 'pt',
  vi: 'vi',
  th: 'th',
  id: 'id',
  ar: 'ar'
};

export function resolveProviderLanguage(
  provider: TranslatorProviderId,
  language: Exclude<CommonLanguageId, 'auto'>
): string {
  if (provider === 'microsoft-translator') {
    return MICROSOFT_MAP[language];
  }

  if (provider === 'aliyun-mt') {
    return ALIYUN_MAP[language];
  }

  return language;
}

export function getPromptLanguageLabel(language: CommonLanguageId): string {
  return PROMPT_LABELS[language];
}

export function normalizeDetectedLanguage(value?: string | null): CommonLanguageId {
  const normalized = (value || '').trim().toLowerCase();

  if (!normalized) {
    return 'auto';
  }

  if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-hans') {
    return 'zh-CN';
  }

  if (normalized === 'zh-tw' || normalized === 'zh-hant') {
    return 'zh-TW';
  }

  if (normalized.startsWith('pt')) {
    return 'pt';
  }

  const directMatches: Record<string, CommonLanguageId> = {
    en: 'en',
    ja: 'ja',
    ko: 'ko',
    es: 'es',
    fr: 'fr',
    de: 'de',
    ru: 'ru',
    vi: 'vi',
    th: 'th',
    id: 'id',
    ar: 'ar'
  };

  return directMatches[normalized] ?? 'auto';
}
