import type { CommonLanguageId, ManualLanguageId } from './languages';

export const SUPPORTED_TRANSLATOR_PROVIDERS = [
  'aliyun-mt',
  'microsoft-translator',
  'openai-compatible'
] as const;

export type TranslatorProviderId =
  (typeof SUPPORTED_TRANSLATOR_PROVIDERS)[number];

export type OverlayMode = 'translation-only' | 'bilingual';
export type ThemeMode = 'light' | 'dark';

export type TranslationStatus =
  | 'translated'
  | 'failed'
  | 'skipped_same_language'
  | 'skipped_not_configured'
  | 'skipped_overload';

export interface TranslatorConfig {
  apiKey: string;
  region?: string;
  workspace?: string;
  baseUrl?: string;
  model?: string;
}

export interface AppSettings {
  roomInput: string;
  proxyUrl: string;
  translatorProvider: TranslatorProviderId;
  translatorConfig: Record<TranslatorProviderId, TranslatorConfig>;
  sourceLanguage: CommonLanguageId;
  targetLanguage: ManualLanguageId;
  showGifts: boolean;
  overlayMode: OverlayMode;
  themeMode: ThemeMode;
  disclaimerAccepted: boolean;
}

export interface WorkerStartConfig {
  roomInput: string;
  proxyUrl: string;
  translatorProvider: TranslatorProviderId;
  translatorConfig: TranslatorConfig;
  sourceLanguage: CommonLanguageId;
  targetLanguage: ManualLanguageId;
}

export interface StatusEvent {
  type: 'status';
  level: 'info' | 'warning';
  message: string;
  timestamp: string;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
  timestamp: string;
}

export interface ChatEvent {
  type: 'chat';
  id: string;
  username: string;
  userId: string;
  originalText: string;
  translatedText: string;
  sourceLanguageRequested: CommonLanguageId;
  sourceLanguageDetected: CommonLanguageId;
  targetLanguage: ManualLanguageId;
  translationStatus: TranslationStatus;
  timestamp: string;
}

export interface GiftEvent {
  type: 'gift';
  id: string;
  username: string;
  userId: string;
  giftId: number;
  giftName: string;
  repeatCount: number;
  diamondCount: number;
  timestamp: string;
}

export type WorkerEvent = StatusEvent | ErrorEvent | ChatEvent | GiftEvent;

export function isTranslatorProviderId(
  value: string
): value is TranslatorProviderId {
  return SUPPORTED_TRANSLATOR_PROVIDERS.includes(
    value as TranslatorProviderId
  );
}
