import { DEFAULT_SETTINGS, normalizeSettings } from './config';

describe('normalizeSettings', () => {
  it('未知输入时回退到默认设置', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('非法语言时回退到默认语言', () => {
    const normalized = normalizeSettings({
      sourceLanguage: 'xx',
      targetLanguage: 'yy'
    });

    expect(normalized.sourceLanguage).toBe(DEFAULT_SETTINGS.sourceLanguage);
    expect(normalized.targetLanguage).toBe(DEFAULT_SETTINGS.targetLanguage);
  });

  it('非法 provider 时回退到默认翻译服务', () => {
    const normalized = normalizeSettings({
      translatorProvider: 'siliconflow'
    });

    expect(normalized.translatorProvider).toBe('aliyun-mt');
  });

  it('保留有效设置并补齐缺失 provider 配置', () => {
    const normalized = normalizeSettings({
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      themeMode: 'dark',
      translatorConfig: {
        'openai-compatible': {
          apiKey: 'sk-demo',
          baseUrl: 'https://example.com/v1',
          model: 'gpt-4.1-mini'
        }
      }
    });

    expect(normalized.sourceLanguage).toBe('en');
    expect(normalized.targetLanguage).toBe('ja');
    expect(normalized.themeMode).toBe('dark');
    expect(normalized.translatorConfig['openai-compatible'].apiKey).toBe(
      'sk-demo'
    );
    expect(normalized.translatorConfig['aliyun-mt'].workspace).toBe('');
  });
});
