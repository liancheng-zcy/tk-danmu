import {
  getPromptLanguageLabel,
  normalizeDetectedLanguage,
  resolveProviderLanguage
} from './language-map';

describe('language-map', () => {
  it('映射微软翻译语言代码', () => {
    expect(resolveProviderLanguage('microsoft-translator', 'zh-CN')).toBe('zh-Hans');
    expect(resolveProviderLanguage('microsoft-translator', 'zh-TW')).toBe('zh-Hant');
    expect(resolveProviderLanguage('microsoft-translator', 'en')).toBe('en');
  });

  it('映射阿里云语言代码', () => {
    expect(resolveProviderLanguage('aliyun-mt', 'zh-CN')).toBe('zh');
    expect(resolveProviderLanguage('aliyun-mt', 'zh-TW')).toBe('zh-tw');
  });

  it('返回 OpenAI 兼容提示用语言名', () => {
    expect(getPromptLanguageLabel('zh-CN')).toBe('Simplified Chinese');
    expect(getPromptLanguageLabel('ja')).toBe('Japanese');
  });

  it('把不同服务的检测语言归一到公共语言集', () => {
    expect(normalizeDetectedLanguage('zh-Hans')).toBe('zh-CN');
    expect(normalizeDetectedLanguage('zh-Hant')).toBe('zh-TW');
    expect(normalizeDetectedLanguage('pt-BR')).toBe('pt');
    expect(normalizeDetectedLanguage('unknown')).toBe('auto');
  });
});
