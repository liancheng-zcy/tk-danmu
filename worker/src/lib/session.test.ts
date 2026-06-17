import { EventEmitter } from 'node:events';
import { vi } from 'vitest';
import type { TranslationAdapter, WorkerStartConfig, WorkerEvent } from './protocol';
import { TikTokSession } from './session';

class FakeConnector extends EventEmitter {
  async connect() {
    return { roomId: 'room-001' };
  }

  async disconnect() {
    this.emit('disconnected');
  }
}

const config: WorkerStartConfig = {
  roomInput: '@demo',
  proxyUrl: '',
  translatorProvider: 'aliyun-mt',
  translatorConfig: {
    apiKey: 'sk-demo',
    model: 'demo-model'
  },
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CN'
};

function createChatPayload(id: string, content = 'hello') {
  return {
    common: {
      msgId: id
    },
    user: {
      id: `viewer-${id}`,
      uniqueId: `viewer-${id}`,
      nickname: `Viewer ${id}`
    },
    content
  };
}

describe('TikTokSession', () => {
  it('输出 status/chat/gift/error 事件流', async () => {
    const connector = new FakeConnector();
    const events: WorkerEvent[] = [];

    const session = new TikTokSession({
      config,
      connector,
      translator: {
        async translate() {
          return {
            translatedText: '你好',
            detectedSourceLanguage: 'en'
          };
        }
      },
      writer: {
        write(event) {
          events.push(event);
        }
      }
    });

    await session.start();

    connector.emit('chat', createChatPayload('chat-1'));
    connector.emit('gift', {
      common: {
        msgId: 'gift-1'
      },
      user: {
        uniqueId: 'viewer-2',
        nickname: 'Viewer 2'
      },
      giftId: 99,
      repeatCount: 2,
      giftDetails: {
        giftName: '玫瑰',
        diamondCount: 1
      }
    });
    connector.emit('error', new Error('network fail'));

    await session.onIdle();

    expect(events.slice(0, 2).map((event) => event.type)).toEqual([
      'status',
      'status'
    ]);
    expect(events.slice(2).map((event) => event.type).sort()).toEqual([
      'chat',
      'error',
      'gift'
    ]);

    const chatEvent = events.find((event) => event.type === 'chat');
    const giftEvent = events.find((event) => event.type === 'gift');
    const errorEvent = events.find((event) => event.type === 'error');

    expect(chatEvent).toMatchObject({
      username: 'Viewer chat-1',
      translatedText: '你好'
    });
    expect(giftEvent).toMatchObject({
      username: 'Viewer 2',
      giftName: '玫瑰'
    });
    expect(errorEvent).toMatchObject({
      message: 'network fail'
    });
  });

  it('同一条消息只输出一次', async () => {
    const connector = new FakeConnector();
    const events: WorkerEvent[] = [];

    const session = new TikTokSession({
      config,
      connector,
      translator: null,
      writer: {
        write(event) {
          events.push(event);
        }
      }
    });

    await session.start();

    connector.emit('chat', createChatPayload('chat-dup-1', 'same message'));
    connector.emit('chat', createChatPayload('chat-dup-1', 'same message'));

    await session.onIdle();

    expect(events.filter((event) => event.type === 'chat')).toHaveLength(1);
  });

  it('翻译超时后回退为原文并标记失败', async () => {
    vi.useFakeTimers();
    const connector = new FakeConnector();
    const events: WorkerEvent[] = [];
    const translator: TranslationAdapter = {
      async translate(input) {
        return new Promise((resolve, reject) => {
          input.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        });
      }
    };

    const session = new TikTokSession({
      config,
      connector,
      translator,
      writer: {
        write(event) {
          events.push(event);
        }
      }
    });

    try {
      await session.start();
      connector.emit('chat', createChatPayload('timeout-1', 'slow text'));

      await vi.advanceTimersByTimeAsync(1_250);
      await session.onIdle();

      expect(events.find((event) => event.type === 'chat')).toMatchObject({
        originalText: 'slow text',
        translatedText: 'slow text',
        translationStatus: 'failed'
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('过载时将最旧未开始任务降级为原文', async () => {
    const connector = new FakeConnector();
    const events: WorkerEvent[] = [];
    let releaseRunningTasks: (() => void) | null = null;
    const runningTasks = new Promise<void>((resolve) => {
      releaseRunningTasks = resolve;
    });
    const translator: TranslationAdapter = {
      async translate() {
        await runningTasks;
        return {
          translatedText: '完成',
          detectedSourceLanguage: 'en'
        };
      }
    };

    const session = new TikTokSession({
      config,
      connector,
      translator,
      writer: {
        write(event) {
          events.push(event);
        }
      }
    });

    await session.start();

    for (let index = 0; index < 30; index += 1) {
      connector.emit('chat', createChatPayload(`load-${index}`, `message-${index}`));
    }

    releaseRunningTasks?.();
    await session.onIdle();

    const overloadEvents = events.filter(
      (event): event is Extract<WorkerEvent, { type: 'chat' }> =>
        event.type === 'chat' && event.translationStatus === 'skipped_overload'
    );

    expect(overloadEvents.length).toBeGreaterThan(0);
    expect(
      events.some(
        (event) =>
          event.type === 'status' && event.message.includes('部分消息已直接显示原文')
      )
    ).toBe(true);
  });
});
