import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ChatEvent, GiftEvent, OverlayMode } from '../../shared/events';
import { getLanguageOption } from '../../shared/languages';

/**
 * How auto-scroll works (two layers):
 *
 * Primary (useEffect on latestEventId): fires when the last event ID changes,
 *   scrolls via virtualizer + DOM in a double-rAF. Protected by
 *   programmaticScrollRef so the scroll handler doesn't accidentally disable
 *   auto-follow when the virtualizer's estimated sizes are inaccurate.
 *
 * Fallback (useEffect on filtered.length): a safety net — if the primary
 *   effect fails to scroll for any reason (layout timing, virtualizer not
 *   ready, React StrictMode double-mount, etc.), this simpler mechanism
 *   detects that items were added and scrolls directly via DOM scrollTop.
 *
 * The two effects are independent: either can fire without the other.
 */

type FeedEvent = ChatEvent | GiftEvent;

interface MessageListProps {
  events: FeedEvent[];
  showGifts: boolean;
  overlayMode: OverlayMode;
  emptyMessage?: string;
}

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

function formatTime(timestamp: string) {
  const value = new Date(timestamp);
  return Number.isNaN(value.getTime()) ? '--:--:--' : timeFormatter.format(value);
}

function getTranslationStatusLabel(status: ChatEvent['translationStatus']) {
  switch (status) {
    case 'translated':
      return '已翻译';
    case 'skipped_same_language':
      return '同语种跳过';
    case 'skipped_not_configured':
      return '未配置翻译';
    case 'skipped_overload':
      return '高流量降级';
    case 'failed':
      return '翻译失败';
    default:
      return '状态未知';
  }
}

function renderChat(event: ChatEvent, overlayMode: OverlayMode) {
  return (
    <article className="message-card message-card-chat" key={event.id}>
      <div className="message-head">
        <div className="message-heading">
          <strong>{event.username}</strong>
          <span>{formatTime(event.timestamp)}</span>
        </div>
        <div className="message-tags">
          <span className="tag">
            {getLanguageOption(event.sourceLanguageDetected as any).label} → {getLanguageOption(event.targetLanguage as any).label}
          </span>
          <span className={`tag tag-status-${event.translationStatus}`}>
            {getTranslationStatusLabel(event.translationStatus)}
          </span>
        </div>
      </div>

      <div className="message-copy">
        {overlayMode === 'bilingual' ? (
          <div className="message-line">
            <span className="line-badge">原</span>
            <p className="message-original">{event.originalText}</p>
          </div>
        ) : null}

        <div className="message-line">
          <span className="line-badge">译</span>
          <p className="message-translation">
            {event.translatedText || event.originalText}
          </p>
        </div>
      </div>
    </article>
  );
}

function renderGift(event: GiftEvent) {
  return (
    <article className="message-card message-card-gift" key={event.id}>
      <div className="message-head">
        <div className="message-heading">
          <strong>{event.username}</strong>
          <span>{formatTime(event.timestamp)}</span>
        </div>
        <div className="message-tags">
          <span className="tag">礼物</span>
          <span className="tag">{event.diamondCount} 钻石</span>
        </div>
      </div>

      <div className="message-line">
        <span className="line-badge">礼</span>
        <p className="message-translation">
          送出了 {event.repeatCount} x {event.giftName}
        </p>
      </div>
    </article>
  );
}

export function MessageList({
  events,
  showGifts,
  overlayMode,
  emptyMessage = '连接直播间后，这里会实时显示弹幕和礼物。'
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const initializedFollowRef = useRef(false);
  const [isAutoFollow, setIsAutoFollow] = useState(true);
  /** Guard: prevents the scroll event handler from disabling auto-follow
   *  during programmatic scrollToBottom calls. Without this guard, the
   *  virtualizer's estimated item sizes (144px) vs actual sizes (~100px
   *  in translation-only mode) cause scroll event handlers to mis-calculate
   *  distanceToBottom > 72, permanently disabling auto-scroll. */
  const programmaticScrollRef = useRef(false);

  const filtered = useMemo(
    () =>
      events.filter((event) => {
        if (event.type === 'gift') {
          return showGifts;
        }

        return true;
      }),
    [events, showGifts]
  );

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    getItemKey: (index) => filtered[index]?.id ?? index,
    estimateSize: () => 144,
    overscan: 8
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const latestEventId = filtered.at(-1)?.id ?? '';
  const totalSize = rowVirtualizer.getTotalSize();
  const shouldRenderFallback =
    virtualItems.length === 0 &&
    filtered.length > 0 &&
    (import.meta.env.MODE === 'test' ||
      window.navigator.userAgent.toLowerCase().includes('jsdom'));

  const scrollToBottom = () => {
    const element = scrollRef.current;
    if (!element || filtered.length === 0) {
      return;
    }

    programmaticScrollRef.current = true;
    // Try both DOM methods — scrollTo() and direct scrollTop assignment.
    // In some environments (Tauri WebView2) one may work while the other
    // is silently ignored by the browser's scroll clamping logic.
    element.scrollTo({ top: element.scrollHeight, left: 0 });
    element.scrollTop = element.scrollHeight;
    programmaticScrollRef.current = false;
  };

  useEffect(() => {
    rowVirtualizer.measure();
  }, [overlayMode, showGifts, rowVirtualizer]);

  useEffect(() => {
    if (filtered.length !== 0) {
      return;
    }

    initializedFollowRef.current = false;
    followRef.current = true;
    setIsAutoFollow(true);
  }, [filtered.length]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const handleScroll = () => {
      if (!initializedFollowRef.current) {
        return;
      }

      // Ignore scroll events triggered by programmatic scrollToBottom() —
      // virtualizer estimated sizes can cause inaccurate distanceToBottom
      // calculations that would wrongly disable auto-follow.
      if (programmaticScrollRef.current) {
        return;
      }

      const distanceToBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      const shouldFollow = distanceToBottom <= 72;
      followRef.current = shouldFollow;
      setIsAutoFollow(shouldFollow);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, []);

  /**
   * Fallback auto-scroll: fires when items are added to the list.
   *
   * This is independent of the primary effect (latestEventId-based). It uses
   * a direct DOM scrollTop instead of the virtualizer's scrollToIndex to
   * avoid any timing issues with virtualizer measurement. The guard against
   * user-scrolled-up (followRef) is shared with the primary effect.
   */
  const prevEventCountRef = useRef(filtered.length);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  useEffect(() => {
    const prev = prevEventCountRef.current;
    prevEventCountRef.current = filtered.length;

    if (filtered.length <= prev || !followRef.current) {
      return;
    }

    const element = scrollRef.current;
    if (!element) {
      return;
    }

    // Use rAF so layout has settled if new content was just committed.
    // Directly set scrollTop to max position for reliability — avoids the
    // virtualizer's scrollToIndex which can interact badly with React
    // startTransition batching.
    requestAnimationFrame(() => {
      if (!followRef.current) {
        return;
      }
      element.scrollTop = element.scrollHeight - element.clientHeight;
    });
  });

  /**
   * ResizeObserver-based scroll: watches the virtual list's inner container
   * for content-height changes and scrolls to the bottom when items grow.
   * This is completely independent of React's render cycle — it fires on
   * actual DOM layout changes, making it robust against startTransition
   * deferrals, React StrictMode double-mounts, and virtualizer measurement
   * races.
   */
  const innerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner || filtered.length === 0) {
      return;
    }

    let prevHeight = inner.offsetHeight;

    const observer = new ResizeObserver(() => {
      const currentHeight = inner.offsetHeight;
      if (currentHeight > prevHeight && followRef.current) {
        const scrollEl = scrollRef.current;
        if (scrollEl) {
          scrollEl.scrollTop = scrollEl.scrollHeight - scrollEl.clientHeight;
        }
      }
      prevHeight = currentHeight;
    });

    observer.observe(inner);

    return () => {
      observer.disconnect();
    };
  }, [filtered.length]);

  useEffect(() => {
    if (!latestEventId) {
      return;
    }

    const shouldFollow = followRef.current || !initializedFollowRef.current;
    if (!shouldFollow) {
      return;
    }

    let nestedFrameId: number | null = null;
    const frameId = requestAnimationFrame(() => {
      initializedFollowRef.current = true;
      followRef.current = true;
      setIsAutoFollow(true);
      scrollToBottom();
      nestedFrameId = requestAnimationFrame(() => {
        scrollToBottom();
      });
    });

    return () => {
      cancelAnimationFrame(frameId);
      if (nestedFrameId !== null) {
        cancelAnimationFrame(nestedFrameId);
      }
    };
  }, [latestEventId, totalSize, rowVirtualizer]);

  return (
    <div className="message-list-shell">
      <div ref={scrollRef} className="message-list" aria-label="消息列表">
        {filtered.length === 0 ? (
          <div className="message-empty">{emptyMessage}</div>
        ) : shouldRenderFallback ? (
          <div className="message-list-fallback">
            {filtered.map((event) =>
              event.type === 'chat'
                ? renderChat(event, overlayMode)
                : renderGift(event)
            )}
          </div>
        ) : (
          <div
            ref={innerRef}
            className="message-list-inner"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {virtualItems.map((virtualItem) => {
              const event = filtered[virtualItem.index];

              return (
                <div
                  key={event.id}
                  ref={rowVirtualizer.measureElement}
                  className="message-virtual-row"
                  data-index={virtualItem.index}
                  style={{
                    transform: `translateY(${virtualItem.start}px)`
                  }}
                >
                  {event.type === 'chat'
                    ? renderChat(event, overlayMode)
                    : renderGift(event)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isAutoFollow && filtered.length > 0 ? (
        <button
          type="button"
          className="back-to-bottom-button"
          onClick={() => {
            initializedFollowRef.current = true;
            followRef.current = true;
            setIsAutoFollow(true);
            scrollToBottom();
          }}
        >
          回到底部
        </button>
      ) : null}
    </div>
  );
}
