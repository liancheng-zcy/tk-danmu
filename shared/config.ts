import type { AppSettings, TranslatorProviderId } from './events';
import { isTranslatorProviderId } from './events';
import { isCommonLanguageId, isManualLanguageId } from './languages';

const EMPTY_TRANSLATOR_CONFIG = {
  apiKey: '',
  region: '',
  workspace: '',
  baseUrl: '',
  model: ''
};

export const DEFAULT_TRANSLATOR_PROVIDER: TranslatorProviderId = 'aliyun-mt';

function createDefaultTranslatorConfig() {
  return {
    'aliyun-mt': { ...EMPTY_TRANSLATOR_CONFIG },
    'microsoft-translator': { ...EMPTY_TRANSLATOR_CONFIG },
    'openai-compatible': { ...EMPTY_TRANSLATOR_CONFIG }
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  roomInput: '',
  proxyUrl: '',
  translatorProvider: DEFAULT_TRANSLATOR_PROVIDER,
  translatorConfig: createDefaultTranslatorConfig(),
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CN',
  showGifts: true,
  overlayMode: 'translation-only',
  themeMode: 'light',
  disclaimerAccepted: false
};

export function normalizeSettings(input: unknown): AppSettings {
  if (!input || typeof input !== 'object') {
    return {
      ...DEFAULT_SETTINGS,
      translatorConfig: createDefaultTranslatorConfig()
    };
  }

  const raw = input as Partial<AppSettings>;
  const sourceLanguage = isCommonLanguageId(String(raw.sourceLanguage ?? ''))
    ? raw.sourceLanguage
    : DEFAULT_SETTINGS.sourceLanguage;
  const targetLanguage = isManualLanguageId(String(raw.targetLanguage ?? ''))
    ? raw.targetLanguage
    : DEFAULT_SETTINGS.targetLanguage;
  const translatorProvider = isTranslatorProviderId(
    String(raw.translatorProvider ?? '')
  )
    ? raw.translatorProvider
    : DEFAULT_TRANSLATOR_PROVIDER;
  const themeMode =
    raw.themeMode === 'dark' || raw.themeMode === 'light'
      ? raw.themeMode
      : DEFAULT_SETTINGS.themeMode;

  const translatorConfig = createDefaultTranslatorConfig();
  const rawConfig = raw.translatorConfig ?? {};

  for (const provider of Object.keys(
    translatorConfig
  ) as TranslatorProviderId[]) {
    translatorConfig[provider] = {
      ...translatorConfig[provider],
      ...(rawConfig[provider] ?? {})
    };
  }

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    translatorProvider,
    translatorConfig,
    sourceLanguage,
    targetLanguage,
    themeMode
  };
}
