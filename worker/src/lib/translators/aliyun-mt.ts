import { normalizeDetectedLanguage, resolveProviderLanguage } from '../language-map';
import type {
  TranslationAdapter,
  TranslationInput,
  TranslationResult,
  TranslatorConfig
} from '../protocol';

const ENDPOINT =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

function withBearerToken(apiKey: string) {
  return apiKey.toLowerCase().startsWith('bearer ') ? apiKey : `Bearer ${apiKey}`;
}

export class AliyunMtTranslator implements TranslationAdapter {
  constructor(private readonly config: TranslatorConfig) {}

  async translate(input: TranslationInput): Promise<TranslationResult> {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      signal: input.signal,
      headers: {
        Authorization: withBearerToken(this.config.apiKey),
        'Content-Type': 'application/json',
        ...(this.config.workspace
          ? {
              'X-DashScope-WorkSpace': this.config.workspace
            }
          : {})
      },
      body: JSON.stringify({
        model: 'qwen-mt-flash',
        input: {
          messages: [
            {
              role: 'user',
              content: input.text
            }
          ]
        },
        parameters: {
          result_format: 'message',
          translation_options: {
            source_lang:
              input.sourceLanguage === 'auto'
                ? 'auto'
                : resolveProviderLanguage('aliyun-mt', input.sourceLanguage),
            target_lang: resolveProviderLanguage(
              'aliyun-mt',
              input.targetLanguage
            )
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`阿里云 MT 调用失败：${response.status}`);
    }

    const payload = await response.json();
    const translatedText =
      payload?.output?.choices?.[0]?.message?.content?.trim() || input.text;

    return {
      translatedText,
      detectedSourceLanguage: normalizeDetectedLanguage(
        payload?.output?.detected_language
      )
    };
  }
}
