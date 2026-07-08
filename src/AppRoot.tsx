import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { DEFAULT_SETTINGS, normalizeSettings } from '../shared/config';
import type {
  AppSettings,
  TranslatorConfig,
  TranslatorProviderId,
  WorkerEvent
} from '../shared/events';
import { ControlPanel } from './components/ControlPanel';
import { DisclaimerModal } from './components/DisclaimerModal';
import { MessageList } from './components/MessageList';
import type { NoticeItem } from './components/ToastStack';
import { ToastStack } from './components/ToastStack';
import { PROVIDER_OPTIONS } from './lib/provider-meta';
import {
  getCurrentWindowLabel,
  getRecentEvents,
  getSessionStatus,
  listenWorkerEvents,
  openOverlayWindow,
  startSession,
  stopSession,
  minimizeWindow,
  toggleMaximizeWindow,
  closeWindow,
  startDraggingWindow,
  isTauriRuntime
} from './lib/tauri-client';
import { loadSettings, saveSettings } from './lib/settings-store';

type FeedEvent = Extract<WorkerEvent, { type: 'chat' | 'gift' }>;
type StatusView = {
  level: 'info' | 'warning';
  message: string;
  timestamp: string;
};

const MAX_FEED_EVENTS = 800;
const MAX_NOTICES = 30;
const MAX_VISIBLE_NOTICES = 3;

function isFeedEvent(event: WorkerEvent): event is FeedEvent {
  return event.type === 'chat' || event.type === 'gift';
}

function isStatusEvent(
  event: WorkerEvent
): event is Extract<WorkerEvent, { type: 'status' }> {
  return event.type === 'status';
}

function createLocalError(message: string): WorkerEvent {
  return {
    type: 'error',
    message,
    timestamp: new Date().toISOString()
  };
}

function useSessionFeed() {
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [running, setRunning] = useState(false);
  const [latestStatus, setLatestStatus] = useState<StatusView | null>(null);
  const pendingEventsRef = useRef<WorkerEvent[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const noticeTimersRef = useRef<Map<string, number>>(new Map());
  const noticeCounterRef = useRef(0);

  const dismissNotice = (id: string) => {
    const timerId = noticeTimersRef.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      noticeTimersRef.current.delete(id);
    }

    setNotices((current) => current.filter((notice) => notice.id !== id));
  };

  const scheduleNoticeDismiss = (notice: NoticeItem) => {
    const timeoutMs = notice.level === 'error' ? 8_000 : 4_000;
    const timerId = window.setTimeout(() => {
      dismissNotice(notice.id);
    }, timeoutMs);
    noticeTimersRef.current.set(notice.id, timerId);
  };

  const flushPendingEvents = () => {
    animationFrameRef.current = null;

    const batch = pendingEventsRef.current.splice(0);
    if (batch.length === 0) {
      return;
    }

    const feedAppends: FeedEvent[] = [];
    const noticeAdds: NoticeItem[] = [];
    let latestStatusUpdate: StatusView | null = null;
    let shouldStopSession = false;

    for (const event of batch) {
      if (isFeedEvent(event)) {
        feedAppends.push(event);
        continue;
      }

      if (isStatusEvent(event)) {
        latestStatusUpdate = {
          level: event.level,
          message: event.message,
          timestamp: event.timestamp
        };

        if (event.level === 'warning') {
          noticeAdds.push({
            id: `notice-${event.timestamp}-${noticeCounterRef.current++}`,
            level: 'warning',
            message: event.message,
            timestamp: event.timestamp
          });
        }

        if (
          event.message.includes('worker 已退出') ||
          event.message.includes('直播连接已断开')
        ) {
          shouldStopSession = true;
        }
        continue;
      }

      noticeAdds.push({
        id: `notice-${event.timestamp}-${noticeCounterRef.current++}`,
        level: 'error',
        message: event.message,
        timestamp: event.timestamp
      });
    }

    // NOTE: intentionally NOT wrapping in startTransition() — in some
    // runtime environments (browser dev, certain Tauri WebView versions)
    // startTransition prevents the render from being committed when nested
    // inside a requestAnimationFrame callback, causing events to silently
    // accumulate without ever reaching the MessageList. Without this wrapper
    // React batches naturally and renders consistently.
    if (feedAppends.length > 0) {
      setFeedEvents((current) =>
        [...current, ...feedAppends].slice(-MAX_FEED_EVENTS)
      );
    }

    if (latestStatusUpdate) {
      setLatestStatus(latestStatusUpdate);
    }

    if (noticeAdds.length > 0) {
      setNotices((current) => [...current, ...noticeAdds].slice(-MAX_NOTICES));
    }

    if (shouldStopSession) {
      setRunning(false);
    }

    noticeAdds.forEach(scheduleNoticeDismiss);
  };

  const queueEvent = (event: WorkerEvent) => {
    pendingEventsRef.current.push(event);
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(flushPendingEvents);
  };

  useEffect(() => {
    let disposed = false;
    let unsubscribe: () => void = () => undefined;

    (async () => {
      const [recentEvents, status] = await Promise.all([
        getRecentEvents(),
        getSessionStatus()
      ]);

      if (disposed) {
        return;
      }

      setFeedEvents(recentEvents.filter(isFeedEvent).slice(-MAX_FEED_EVENTS));
      setRunning(status.running);

      const recentStatus = [...recentEvents]
        .reverse()
        .find((event): event is Extract<WorkerEvent, { type: 'status' }> =>
          isStatusEvent(event)
        );

      if (recentStatus) {
        setLatestStatus({
          level: recentStatus.level,
          message: recentStatus.message,
          timestamp: recentStatus.timestamp
        });
      }

      unsubscribe = await listenWorkerEvents(queueEvent);
    })();

    return () => {
      disposed = true;
      unsubscribe();

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      noticeTimersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      noticeTimersRef.current.clear();
    };
  }, []);

  return {
    feedEvents,
    notices,
    latestStatus,
    running,
    setRunning,
    dismissNotice,
    pushLocalError(message: string) {
      queueEvent(createLocalError(message));
    }
  };
}

function useThemeMode(themeMode: AppSettings['themeMode']) {
  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);
}

function MainWindowApp() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const {
    feedEvents,
    notices,
    latestStatus,
    running,
    setRunning,
    dismissNotice,
    pushLocalError
  } = useSessionFeed();

  useThemeMode(settings.themeMode);

  useEffect(() => {
    (async () => {
      const stored = await loadSettings();
      setSettings(normalizeSettings(stored));
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    void saveSettings(settings);
  }, [loaded, settings]);

  const metrics = useMemo(() => {
    const chatCount = feedEvents.filter((event) => event.type === 'chat').length;
    const giftCount = feedEvents.filter((event) => event.type === 'gift').length;

    return {
      chatCount,
      giftCount
    };
  }, [feedEvents]);

  const activeProviderLabel =
    PROVIDER_OPTIONS.find((option) => option.id === settings.translatorProvider)?.label ??
    '翻译服务';

  const visibleNotices = notices.slice(-MAX_VISIBLE_NOTICES);
  const statusText =
    latestStatus?.message ?? (running ? '正在监听直播间消息' : '等待连接');

  const handleChange = <K extends keyof AppSettings>(
    field: K,
    value: AppSettings[K]
  ) => {
    setSettings((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleTranslatorConfigChange = (
    provider: TranslatorProviderId,
    field: keyof TranslatorConfig,
    value: string
  ) => {
    setSettings((current) => ({
      ...current,
      translatorConfig: {
        ...current.translatorConfig,
        [provider]: {
          ...current.translatorConfig[provider],
          [field]: value
        }
      }
    }));
  };

  const handleAcceptDisclaimer = () => {
    handleChange('disclaimerAccepted', true);
  };

  const handleStart = async () => {
    try {
      await startSession({
        roomInput: settings.roomInput,
        proxyUrl: settings.proxyUrl,
        translatorProvider: settings.translatorProvider,
        translatorConfig: settings.translatorConfig[settings.translatorProvider],
        sourceLanguage: settings.sourceLanguage,
        targetLanguage: settings.targetLanguage
      });
      setRunning(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '启动会话失败，请检查直播间和翻译配置。';
      pushLocalError(message);
    }
  };

  const handleStop = async () => {
    await stopSession();
    setRunning(false);
  };

  if (!loaded) {
    return <div className="app-loading">正在加载本地配置...</div>;
  }

  return (
    <div className="app-shell">
      <DisclaimerModal
        open={!settings.disclaimerAccepted}
        onAccept={handleAcceptDisclaimer}
      />

      <ControlPanel
        settings={settings}
        isRunning={running}
        onStart={handleStart}
        onStop={handleStop}
        onOpenOverlay={() => void openOverlayWindow()}
        onChange={handleChange}
        onTranslatorConfigChange={handleTranslatorConfigChange}
      />

      <section className="feed-panel">
        <ToastStack notices={visibleNotices} onDismiss={dismissNotice} />

        <div className="feed-panel-head">
          <div>
            <p className="eyebrow">Live Monitor</p>
            <h2>实时消息流</h2>
            <p className="panel-description">
              {running
                ? '正在接收弹幕，实时滚动显示最新消息。'
                : '输入直播间地址即可开始，翻译服务可选配置。'}
            </p>
            <p className="session-status-text">当前状态：{statusText}</p>
          </div>
          <div className="feed-summary-grid">
            <div className="summary-card">
              <span>当前服务</span>
              <strong>{activeProviderLabel}</strong>
            </div>
            <div className="summary-card">
              <span>弹幕</span>
              <strong>{metrics.chatCount}</strong>
            </div>
            <div className="summary-card">
              <span>礼物</span>
              <strong>{metrics.giftCount}</strong>
            </div>
          </div>
        </div>

        <MessageList
          events={feedEvents}
          showGifts={settings.showGifts}
          overlayMode={settings.overlayMode}
        />
      </section>
    </div>
  );
}

function OverlayWindowApp() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const { feedEvents, notices, latestStatus, dismissNotice } = useSessionFeed();

  useThemeMode(settings.themeMode);

  useEffect(() => {
    (async () => {
      const stored = await loadSettings();
      setSettings(normalizeSettings(stored));
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    void saveSettings(settings);
  }, [loaded, settings]);

  if (!loaded) {
    return <div className="overlay-shell">悬浮窗加载中...</div>;
  }

  const isTauri = isTauriRuntime();

  const handleTitlebarMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    if ((event.target as HTMLElement).closest('.overlay-titlebar-btn')) {
      return;
    }
    void startDraggingWindow();
  };

  return (
    <div className="overlay-shell">
      <ToastStack
        notices={notices.slice(-MAX_VISIBLE_NOTICES)}
        onDismiss={dismissNotice}
      />

      <div
        className="overlay-titlebar"
        data-tauri-drag-region
        onMouseDown={handleTitlebarMouseDown}
      >
        <span className="overlay-titlebar-label" data-tauri-drag-region>
          {latestStatus?.message ?? '弹幕悬浮窗'}
        </span>

        <div className="overlay-titlebar-actions">
          <button
            type="button"
            className="overlay-titlebar-btn"
            data-tauri-no-drag-region
            onClick={() =>
              setSettings((current) => ({
                ...current,
                overlayMode:
                  current.overlayMode === 'translation-only'
                    ? 'bilingual'
                    : 'translation-only'
              }))
            }
            title="切换显示模式"
          >
            {settings.overlayMode === 'translation-only' ? '译' : '双'}
          </button>

          {isTauri ? (
            <>
              <button
                type="button"
                className="overlay-titlebar-btn"
                data-tauri-no-drag-region
                onClick={() => { minimizeWindow().catch(() => {}); }}
                title="最小化"
              >
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <rect x="1" y="5.5" width="10" height="1" fill="currentColor"/>
                </svg>
              </button>
              <button
                type="button"
                className="overlay-titlebar-btn"
                data-tauri-no-drag-region
                onClick={() => { toggleMaximizeWindow().catch(() => {}); }}
                title="最大化"
              >
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <rect x="1.5" y="1.5" width="9" height="9" rx="0.8" fill="none" stroke="currentColor" stroke-width="1.1"/>
                </svg>
              </button>
              <button
                type="button"
                className="overlay-titlebar-btn overlay-titlebar-close"
                data-tauri-no-drag-region
                onClick={() => { closeWindow().catch(() => {}); }}
                title="关闭"
              >
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                </svg>
              </button>
            </>
          ) : null}
        </div>
      </div>

      <MessageList
        events={feedEvents}
        showGifts={settings.showGifts}
        overlayMode={settings.overlayMode}
      />
    </div>
  );
}

export function AppRoot() {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);

  useEffect(() => {
    void getCurrentWindowLabel().then(setWindowLabel);
  }, []);

  // ⚠️ Must wait for window label before rendering anything.
  // If we default to 'main', the overlay window briefly renders
  // MainWindowApp, which calls useSessionFeed() and registers a
  // Tauri event listener. When the label resolves and we switch
  // to OverlayWindowApp, the first listener may leak and compete
  // with the second — events go to the wrong pendingEventsRef,
  // latestEventId never updates, and auto-scroll silently breaks.
  if (windowLabel === null) {
    return <div className="app-loading">加载中...</div>;
  }

  return windowLabel === 'overlay' ? <OverlayWindowApp /> : <MainWindowApp />;
}
