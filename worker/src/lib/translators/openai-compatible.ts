import {
  getPromptLanguageLabel,
  normalizeDetectedLanguage
} from '../language-map';
import type {
  CommonLanguageId,
  TranslationAdapter,
  TranslationInput,
  TranslationResult,
  TranslatorConfig
} from '../protocol';

function extractContent(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item?.text || '')
      .join('')
      .trim();
  }

  return '';
}

function parseJsonResponse(content: string): {
  translation: string;
  detectedSourceLanguage?: string;
} {
  const trimmed = content.trim();
  const jsonBlockMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonText = jsonBlockMatch ? jsonBlockMatch[0] : trimmed;
  const parsed = JSON.parse(jsonText);

  return {
    translation: String(parsed.translation ?? '').trim(),
    detectedSourceLanguage: String(
      parsed.detectedSourceLanguage ?? parsed.sourceLanguageDetected ?? ''
    ).trim()
  };
}

function buildPrompt(input: TranslationInput): string {
  const sourceHint =
    input.sourceLanguage === 'auto'
      ? '先检测源语言，再完成翻译。'
      : `源语言固定为 ${getPromptLanguageLabel(input.sourceLanguage)}。`;

  return [
    `请把用户文本翻译为 ${getPromptLanguageLabel(input.targetLanguage)}。`,
    sourceHint,
    '只返回 JSON，不要附加解释或 Markdown。',
    'JSON 结构必须是 {"detectedSourceLanguage":"语言代码","translation":"译文"}。',
    'detectedSourceLanguage 只能使用以下代码之一：auto, zh-CN, zh-TW, en, ja, ko, es, fr, de, ru, pt, vi, th, id, ar。',
    `用户文本：${input.text}`
  ].join('\n');
}

export class OpenAiCompatibleTranslator implements TranslationAdapter {
  constructor(private readonly config: TranslatorConfig) {}

  async translate(input: TranslationInput): Promise<TranslationResult> {
    const baseUrl = (this.config.baseUrl || '').replace(/\/+$/, '');
    const model = this.config.model || '';

    if (!baseUrl || !model) {
      throw new Error('OpenAI 兼容翻译器缺少 Base URL 或 Model');
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: input.signal,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: '你是一个只负责翻译的引擎。'
          },
          {
            role: 'user',
            content: buildPrompt(input)
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI 兼容翻译调用失败：${response.status}`);
    }

    const payload = await response.json();
    const parsed = parseJsonResponse(extractContent(payload));

    return {
      translatedText: parsed.translation || input.text,
      detectedSourceLanguage: normalizeDetectedLanguage(
        parsed.detectedSourceLanguage
      ) as CommonLanguageId
    };
  }
}
