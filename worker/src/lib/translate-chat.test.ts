import type { WorkerStartConfig } from '../../../shared/events';
import { translateChatMessage } from './translate-chat';

const baseConfig: WorkerStartConfig = {
  roomInput: '@demo',
  proxyUrl: '',
  translatorProvider: 'openai-compatible',
  translatorConfig: {
    apiKey: 'sk-demo',
    model: 'demo-model'
  },
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CN'
};

describe('translateChatMessage', () => {
  it('源语言与目标语言一致时跳过翻译', async () => {
    const event = await translateChatMessage(
      {
        username: 'Tester',
        userId: 'user-1',
        originalText: 'hello',
        timestamp: '2026-06-16T00:00:00.000Z'
      },
      {
        ...baseConfig,
        sourceLanguage: 'en',
        targetLanguage: 'en'
      },
      null
    );

    expect(event.translationStatus).toBe('skipped_same_language');
    expect(event.translatedText).toBe('hello');
    expect(event.sourceLanguageDetected).toBe('en');
  });

  it('未配置翻译器时保留原文并回填检测语言', async () => {
    const event = await translateChatMessage(
      {
        username: 'Tester',
        userId: 'user-1',
        originalText: 'hola',
        timestamp: '2026-06-16T00:00:00.000Z'
      },
      baseConfig,
      null
    );

    expect(event.translationStatus).toBe('skipped_not_configured');
    expect(event.translatedText).toBe('hola');
    expect(event.sourceLanguageDetected).toBe('en');
  });

  it('翻译成功时回填检测语言', async () => {
    const event = await translateChatMessage(
      {
        username: 'Tester',
        userId: 'user-1',
        originalText: 'hola',
        timestamp: '2026-06-16T00:00:00.000Z'
      },
      baseConfig,
      {
        async translate() {
          return {
            translatedText: '你好',
            detectedSourceLanguage: 'es'
          };
        }
      }
    );

    expect(event.translationStatus).toBe('translated');
    expect(event.translatedText).toBe('你好');
    expect(event.sourceLanguageDetected).toBe('es');
  });

  it('翻译异常时降级为失败状态', async () => {
    const event = await translateChatMessage(
      {
        username: 'Tester',
        userId: 'user-1',
        originalText: 'bonjour',
        timestamp: '2026-06-16T00:00:00.000Z'
      },
      baseConfig,
      {
        async translate() {
          throw new Error('boom');
        }
      }
    );

    expect(event.translationStatus).toBe('failed');
    expect(event.translatedText).toBe('bonjour');
  });
});
