import { detectLanguageFromText } from './detect-language';
import type {
  ChatEvent,
  ChatMessageInput,
  CommonLanguageId,
  TranslationAdapter,
  TranslationStatus,
  WorkerStartConfig
} from './protocol';

interface TranslateChatOptions {
  signal?: AbortSignal;
  forceStatus?: TranslationStatus;
}

function resolveDetectedLanguage(
  requestedLanguage: CommonLanguageId,
  originalText: string,
  detectedLanguage?: CommonLanguageId,
  allowHeuristic = true
): CommonLanguageId {
  if (detectedLanguage && detectedLanguage !== 'auto') {
    return detectedLanguage;
  }

  if (requestedLanguage !== 'auto') {
    return requestedLanguage;
  }

  if (!allowHeuristic) {
    return 'auto';
  }

  return detectLanguageFromText(originalText);
}

export async function translateChatMessage(
  input: ChatMessageInput,
  config: WorkerStartConfig,
  translator: TranslationAdapter | null,
  options: TranslateChatOptions = {}
): Promise<ChatEvent> {
  const baseEvent: Omit<
    ChatEvent,
    'translatedText' | 'sourceLanguageDetected' | 'translationStatus'
  > = {
    type: 'chat',
    id:
      input.id ||
      `${input.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    username: input.username,
    userId: input.userId,
    originalText: input.originalText,
    sourceLanguageRequested: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    timestamp: input.timestamp
  };

  if (
    config.sourceLanguage !== 'auto' &&
    config.sourceLanguage === config.targetLanguage
  ) {
    return {
      ...baseEvent,
      translatedText: input.originalText,
      sourceLanguageDetected: config.sourceLanguage,
      translationStatus: 'skipped_same_language'
    };
  }

  if (!translator) {
    return {
      ...baseEvent,
      translatedText: input.originalText,
      sourceLanguageDetected: resolveDetectedLanguage(
        config.sourceLanguage,
        input.originalText,
        input.detectedLanguageHint,
        true
      ),
      translationStatus: options.forceStatus ?? 'skipped_not_configured'
    };
  }

  try {
    const result = await translator.translate({
      text: input.originalText,
      sourceLanguage: config.sourceLanguage,
      targetLanguage: config.targetLanguage,
      signal: options.signal
    });

    return {
      ...baseEvent,
      translatedText: result.translatedText || input.originalText,
      sourceLanguageDetected: resolveDetectedLanguage(
        config.sourceLanguage,
        input.originalText,
        result.detectedSourceLanguage || input.detectedLanguageHint
      ),
      translationStatus: 'translated'
    };
  } catch {
    return {
      ...baseEvent,
      translatedText: input.originalText,
      sourceLanguageDetected: resolveDetectedLanguage(
        config.sourceLanguage,
        input.originalText,
        input.detectedLanguageHint,
        true
      ),
      translationStatus: 'failed'
    };
  }
}
