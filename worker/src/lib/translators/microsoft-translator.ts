import { normalizeDetectedLanguage, resolveProviderLanguage } from '../language-map';
import type {
  TranslationAdapter,
  TranslationInput,
  TranslationResult,
  TranslatorConfig
} from '../protocol';

export class MicrosoftTranslatorAdapter implements TranslationAdapter {
  constructor(private readonly config: TranslatorConfig) {}

  async translate(input: TranslationInput): Promise<TranslationResult> {
    const endpoint = new URL(
      'https://api.cognitive.microsofttranslator.com/translate'
    );
    endpoint.searchParams.set('api-version', '3.0');
    endpoint.searchParams.set(
      'to',
      resolveProviderLanguage('microsoft-translator', input.targetLanguage)
    );

    if (input.sourceLanguage !== 'auto') {
      endpoint.searchParams.set(
        'from',
        resolveProviderLanguage('microsoft-translator', input.sourceLanguage)
      );
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      signal: input.signal,
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.config.apiKey,
        'Ocp-Apim-Subscription-Region': this.config.region || ''
      },
      body: JSON.stringify([{ text: input.text }])
    });

    if (!response.ok) {
      throw new Error(`微软翻译调用失败：${response.status}`);
    }

    const payload = (await response.json()) as Array<{
      detectedLanguage?: { language?: string };
      translations?: Array<{ text?: string }>;
    }>;

    return {
      translatedText: payload?.[0]?.translations?.[0]?.text?.trim() || input.text,
      detectedSourceLanguage: normalizeDetectedLanguage(
        payload?.[0]?.detectedLanguage?.language
      )
    };
  }
}
