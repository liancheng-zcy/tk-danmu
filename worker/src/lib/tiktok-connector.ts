import { HttpsProxyAgent } from 'https-proxy-agent';
import type { WorkerStartConfig } from './protocol';
import { parseRoomInput } from './room-input';

const {
  TikTokLiveConnection,
  WebcastEvent
}: {
  TikTokLiveConnection: new (...args: any[]) => any;
  WebcastEvent: Record<string, string>;
} = require('tiktok-live-connector');

export function createTikTokConnector(config: WorkerStartConfig) {
  const username = parseRoomInput(config.roomInput);
  if (!username) {
    throw new Error('请输入有效的 TikTok 直播间用户名或直播链接');
  }

  const proxyUrl = config.proxyUrl.trim();
  const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

  const connection = new TikTokLiveConnection(username, {
    ...(proxyAgent
      ? {
          webClientOptions: {
            agent: { http: proxyAgent, https: proxyAgent },
            timeout: 30000
          },
          wsClientOptions: { agent: proxyAgent, timeout: 30000 }
        }
      : {})
  });

  return {
    connect: async () => connection.connect(),
    on(event: string, listener: (payload?: any) => void) {
      switch (event) {
        case 'chat':
          connection.on(WebcastEvent.CHAT, listener);
          break;
        case 'gift':
          connection.on(WebcastEvent.GIFT, listener);
          break;
        default:
          connection.on(event as any, listener);
          break;
      }
    }
  };
}
