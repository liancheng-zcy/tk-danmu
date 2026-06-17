import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ChatEvent, GiftEvent } from '../../shared/events';
import { MessageList } from './MessageList';

const chatEvent: ChatEvent = {
  type: 'chat',
  id: 'chat-1',
  username: 'Viewer 1',
  userId: 'viewer-1',
  originalText: 'hello',
  translatedText: '你好',
  sourceLanguageRequested: 'auto',
  sourceLanguageDetected: 'en',
  targetLanguage: 'zh-CN',
  translationStatus: 'translated',
  timestamp: '2026-06-16T00:00:00.000Z'
};

const giftEvent: GiftEvent = {
  type: 'gift',
  id: 'gift-1',
  username: 'Viewer 2',
  userId: 'viewer-2',
  giftId: 99,
  giftName: '玫瑰',
  repeatCount: 2,
  diamondCount: 1,
  timestamp: '2026-06-16T00:00:01.000Z'
};

async function waitForAnimationFrame() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function buildEvents(count: number, prefix: string) {
  return Array.from({ length: count }, (_, index) => ({
    ...chatEvent,
    id: `${prefix}-${index}`,
    username: `Viewer ${index}`,
    userId: `viewer-${prefix}-${index}`,
    originalText: `hello-${prefix}-${index}`,
    translatedText: `你好-${prefix}-${index}`
  }));
}

describe('MessageList', () => {
  it('hides gift events when gift display is disabled', () => {
    render(
      <MessageList
        events={[chatEvent, giftEvent]}
        showGifts={false}
        overlayMode="translation-only"
      />
    );

    expect(screen.queryByText('玫瑰')).not.toBeInTheDocument();
    expect(screen.getByText('你好')).toBeInTheDocument();
  });

  it('shows original and translated markers in bilingual mode', () => {
    render(
      <MessageList
        events={[chatEvent, giftEvent]}
        showGifts
        overlayMode="bilingual"
      />
    );

    expect(screen.getByText('原')).toBeInTheDocument();
    expect(screen.getByText('译')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.queryByText('弹幕')).not.toBeInTheDocument();
  });

  it('shows the back-to-bottom button after the user scrolls upward', async () => {
    render(
      <MessageList
        events={buildEvents(20, 'scroll')}
        showGifts
        overlayMode="translation-only"
      />
    );

    await waitForAnimationFrame();

    const list = screen.getByLabelText('消息列表');
    Object.defineProperty(list, 'scrollHeight', {
      value: 2400,
      configurable: true
    });
    Object.defineProperty(list, 'clientHeight', {
      value: 480,
      configurable: true
    });
    Object.defineProperty(list, 'scrollTop', {
      value: 1200,
      writable: true,
      configurable: true
    });

    fireEvent.scroll(list);
    expect(screen.getByRole('button', { name: '回到底部' })).toBeInTheDocument();
  });

  it('keeps auto-follow enabled when mounted with an existing backlog', async () => {
    const scrollHeightSpy = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(2400);
    const clientHeightSpy = vi
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(480);
    const scrollTopSpy = vi
      .spyOn(HTMLElement.prototype, 'scrollTop', 'get')
      .mockReturnValue(0);

    render(
      <MessageList
        events={buildEvents(20, 'mounted')}
        showGifts
        overlayMode="translation-only"
      />
    );

    await waitForAnimationFrame();

    expect(
      screen.queryByRole('button', { name: '回到底部' })
    ).not.toBeInTheDocument();

    scrollHeightSpy.mockRestore();
    clientHeightSpy.mockRestore();
    scrollTopSpy.mockRestore();
  });

  it('scrolls the list container when auto-follow is active', async () => {
    const scrollToSpy = vi.spyOn(HTMLElement.prototype, 'scrollTo');

    render(
      <MessageList
        events={buildEvents(20, 'autofollow')}
        showGifts
        overlayMode="translation-only"
      />
    );

    await waitForAnimationFrame();

    expect(scrollToSpy).toHaveBeenCalled();
    scrollToSpy.mockRestore();
  });

  it('still auto-follows when the feed stays capped at the same length', async () => {
    const scrollToSpy = vi.spyOn(HTMLElement.prototype, 'scrollTo');
    const initialEvents = buildEvents(800, 'cap-a');
    const nextEvents = buildEvents(800, 'cap-b');

    const { rerender } = render(
      <MessageList
        events={initialEvents}
        showGifts
        overlayMode="translation-only"
      />
    );

    await waitForAnimationFrame();
    const initialCallCount = scrollToSpy.mock.calls.length;

    rerender(
      <MessageList
        events={nextEvents}
        showGifts
        overlayMode="translation-only"
      />
    );

    await waitForAnimationFrame();

    expect(scrollToSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
    scrollToSpy.mockRestore();
  });
});
