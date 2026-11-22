import '@testing-library/jest-dom/vitest';

if (typeof URL.createObjectURL !== 'function') {
  Object.defineProperty(URL, 'createObjectURL', {
    value: () => 'blob:mock-object-url',
    writable: true,
    configurable: true,
  });
}

if (typeof URL.revokeObjectURL !== 'function') {
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: () => undefined,
    writable: true,
    configurable: true,
  });
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  class MockResizeObserver {
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe() {
      // Trigger callback asynchronously only when explicitly needed
      void this.callback;
    }

    unobserve() {
      // noop
    }

    disconnect() {
      // noop
    }
  }

  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: MockResizeObserver,
    writable: true,
    configurable: true,
  });
}
