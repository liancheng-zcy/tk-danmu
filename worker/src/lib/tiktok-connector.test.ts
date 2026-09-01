import { createTikTokConnector } from './tiktok-connector';
import type { WorkerStartConfig } from './protocol';

const config: WorkerStartConfig = {
  roomInput: '@demo',
  proxyUrl: 'http://127.0.0.1:7890',
  translatorProvider: 'aliyun-mt',
  translatorConfig: {
    apiKey: 'test-key'
  },
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CN'
};

describe('createTikTokConnector', () => {
  it('使用代理创建连接器时不会把旧版 httpsAgent 传给 Got', () => {
    expect(() => createTikTokConnector(config)).not.toThrow();
  });
});
