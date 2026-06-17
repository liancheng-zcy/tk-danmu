export type CommonLanguageId =
  | 'auto'
  | 'zh-CN'
  | 'zh-TW'
  | 'en'
  | 'ja'
  | 'ko'
  | 'es'
  | 'fr'
  | 'de'
  | 'ru'
  | 'pt'
  | 'vi'
  | 'th'
  | 'id'
  | 'ar';

export type ManualLanguageId = Exclude<CommonLanguageId, 'auto'>;

export type TranslatorProviderId =
  | 'aliyun-mt'
  | 'microsoft-translator'
  | 'openai-compatible';

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

export interface WorkerStartConfig {
  roomInput: string;
  proxyUrl: string;
  translatorProvider: TranslatorProviderId;
  translatorConfig: TranslatorConfig;
  sourceLanguage: CommonLanguageId;
  targetLanguage: ManualLanguageId;
}

export interface ChatMessageInput {
  id?: string;
  username: string;
  userId: string;
  originalText: string;
  timestamp: string;
  detectedLanguageHint?: CommonLanguageId;
}

export interface TranslationInput {
  text: string;
  sourceLanguage: CommonLanguageId;
  targetLanguage: ManualLanguageId;
  signal?: AbortSignal;
}

export interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage?: CommonLanguageId;
}

export interface TranslationAdapter {
  translate(input: TranslationInput): Promise<TranslationResult>;
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

export type WorkerEvent = ChatEvent | GiftEvent | StatusEvent | ErrorEvent;
