import '@testing-library/jest-dom/vitest';

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: ResizeObserverMock,
  writable: true
});

if (typeof HTMLElement !== 'undefined') {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    value: function scrollTo(options?: number | ScrollToOptions, y?: number) {
      if (typeof options === 'number') {
        this.scrollLeft = options;
        this.scrollTop = y ?? 0;
        return;
      }

      this.scrollLeft = options?.left ?? this.scrollLeft;
      this.scrollTop = options?.top ?? this.scrollTop;
    },
    writable: true
  });
}
