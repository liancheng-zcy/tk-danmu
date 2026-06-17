import { normalizeDetectedLanguage } from './language-map';
import { detectLanguageFromText } from './detect-language';
import { formatGiftEvent } from './gift-format';
import { OrderedConcurrentQueue } from './message-queue';
import type {
  ChatEvent,
  ChatMessageInput,
  TranslationAdapter,
  WorkerEvent,
  WorkerStartConfig
} from './protocol';
import { translateChatMessage } from './translate-chat';

interface LiveConnector {
  connect(): Promise<{ roomId?: string }>;
  disconnect?: () => Promise<void> | void;
  on(event: string, listener: (payload?: any) => void): void;
}

interface EventWriter {
  write(event: WorkerEvent): void;
}

interface SessionOptions {
  config: WorkerStartConfig;
  connector: LiveConnector;
  translator: TranslationAdapter | null;
  writer: EventWriter;
}

const TRANSLATION_TIMEOUT_MS = 1_200;
const MAX_PENDING_TRANSLATIONS = 24;
const MAX_CONCURRENT_TRANSLATIONS = 4;
const OVERLOAD_WARNING_THROTTLE_MS = 2_000;

function createTimestamp() {
  return new Date().toISOString();
}

function createStatusEvent(
  level: 'info' | 'warning',
  message: string
): WorkerEvent {
  return {
    type: 'status',
    level,
    message,
    timestamp: createTimestamp()
  };
}

function createErrorEvent(message: string): WorkerEvent {
  return {
    type: 'error',
    message,
    timestamp: createTimestamp()
  };
}

function createChatInput(payload: any): ChatMessageInput | null {
  const originalText = payload?.content?.trim() || payload?.comment?.trim() || '';
  if (!originalText) {
    return null;
  }

  return {
    id: payload?.common?.msgId?.trim(),
    username:
      payload?.user?.nickname?.trim() ||
      payload?.user?.displayId?.trim() ||
      payload?.user?.uniqueId?.trim() ||
      payload?.user?.id?.trim() ||
      '未知用户',
    userId:
      payload?.user?.id?.trim() ||
      payload?.user?.uniqueId?.trim() ||
      payload?.user?.displayId?.trim() ||
      'unknown-user',
    originalText,
    timestamp: createTimestamp(),
    detectedLanguageHint: normalizeDetectedLanguage(payload?.contentLanguage)
  };
}

export class TikTokSession {
  private readonly seenEventIds = new Set<string>();

  private readonly config: WorkerStartConfig;

  private readonly connector: LiveConnector;

  private readonly translator: TranslationAdapter | null;

  private readonly writer: EventWriter;

  private readonly queue = new OrderedConcurrentQueue<ChatEvent>({
    maxConcurrent: MAX_CONCURRENT_TRANSLATIONS,
    maxPending: MAX_PENDING_TRANSLATIONS,
    onResult: (event) => {
      this.writer.write(event);
    }
  });

  private initialized = false;

  private nextChatSequence = 0;

  private lastOverloadWarningAt = 0;

  constructor(options: SessionOptions) {
    this.config = options.config;
    this.connector = options.connector;
    this.translator = options.translator;
    this.writer = options.writer;
  }

  async start() {
    if (!this.initialized) {
      this.attachListeners();
      this.initialized = true;
    }

    this.writer.write(createStatusEvent('info', '正在连接 TikTok 直播间...'));
    const result = await this.connector.connect();
    this.writer.write(
      createStatusEvent(
        'info',
        `已连接直播间 ${result.roomId ?? this.config.roomInput}`
      )
    );
  }

  async stop() {
    await this.connector.disconnect?.();
  }

  async onIdle() {
    await this.queue.onIdle();
  }

  private rememberEventId(id?: string) {
    const normalizedId = id?.trim();
    if (!normalizedId) {
      return false;
    }

    if (this.seenEventIds.has(normalizedId)) {
      return true;
    }

    this.seenEventIds.add(normalizedId);

    if (this.seenEventIds.size > 500) {
      const oldestId = this.seenEventIds.values().next().value;
      if (oldestId) {
        this.seenEventIds.delete(oldestId);
      }
    }

    return false;
  }

  private createOverloadFallback(input: ChatMessageInput): ChatEvent {
    return {
      type: 'chat',
      id:
        input.id ||
        `${input.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      username: input.username,
      userId: input.userId,
      originalText: input.originalText,
      translatedText: input.originalText,
      sourceLanguageRequested: this.config.sourceLanguage,
      sourceLanguageDetected:
        input.detectedLanguageHint && input.detectedLanguageHint !== 'auto'
          ? input.detectedLanguageHint
          : this.config.sourceLanguage !== 'auto'
            ? this.config.sourceLanguage
            : detectLanguageFromText(input.originalText),
      targetLanguage: this.config.targetLanguage,
      translationStatus: 'skipped_overload',
      timestamp: input.timestamp
    };
  }

  private maybeEmitOverloadWarning() {
    const now = Date.now();
    if (now - this.lastOverloadWarningAt < OVERLOAD_WARNING_THROTTLE_MS) {
      return;
    }

    this.lastOverloadWarningAt = now;
    this.writer.write(
      createStatusEvent('warning', '弹幕过多，部分消息已直接显示原文')
    );
  }

  private attachListeners() {
    this.connector.on('chat', (payload) => {
      const input = createChatInput(payload);
      if (!input) {
        return;
      }

      if (this.rememberEventId(input.id)) {
        return;
      }

      const sequence = this.nextChatSequence;
      this.nextChatSequence += 1;

      this.queue.enqueue({
        sequence,
        timeoutMs: TRANSLATION_TIMEOUT_MS,
        run: async (signal) =>
          translateChatMessage(input, this.config, this.translator, { signal }),
        onDrop: () => {
          this.maybeEmitOverloadWarning();
          return this.createOverloadFallback(input);
        }
      });
    });

    this.connector.on('gift', (payload) => {
      if (this.rememberEventId(payload?.common?.msgId?.trim())) {
        return;
      }

      this.writer.write(formatGiftEvent(payload));
    });

    this.connector.on('error', (error) => {
      this.writer.write(
        createErrorEvent(error instanceof Error ? error.message : 'unknown')
      );
    });

    this.connector.on('disconnected', () => {
      this.writer.write(createStatusEvent('warning', '直播连接已断开'));
    });
  }
}
