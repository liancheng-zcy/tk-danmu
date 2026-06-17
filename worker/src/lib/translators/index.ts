import type {
  TranslationAdapter,
  TranslatorConfig,
  TranslatorProviderId
} from '../protocol';
import { AliyunMtTranslator } from './aliyun-mt';
import { MicrosoftTranslatorAdapter } from './microsoft-translator';
import { OpenAiCompatibleTranslator } from './openai-compatible';

function hasValue(value?: string) {
  return Boolean(value?.trim());
}

function isConfigured(
  provider: TranslatorProviderId,
  config: TranslatorConfig
): boolean {
  if (!hasValue(config.apiKey)) {
    return false;
  }

  if (provider === 'microsoft-translator') {
    return hasValue(config.region);
  }

  if (provider === 'openai-compatible') {
    return hasValue(config.baseUrl) && hasValue(config.model);
  }

  return true;
}

export function createTranslator(
  provider: TranslatorProviderId,
  config: TranslatorConfig
): TranslationAdapter | null {
  if (!isConfigured(provider, config)) {
    return null;
  }

  switch (provider) {
    case 'aliyun-mt':
      return new AliyunMtTranslator(config);
    case 'microsoft-translator':
      return new MicrosoftTranslatorAdapter(config);
    case 'openai-compatible':
      return new OpenAiCompatibleTranslator(config);
    default:
      return null;
  }
}
