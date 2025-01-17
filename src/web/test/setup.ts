/**
 * @fileoverview Global test setup configuration for web application testing
 * @version 1.0.0
 */

import '@testing-library/jest-dom'; // v5.16.5
import { server } from './mocks/server';

/**
 * Configure global test environment before running any tests
 * - Starts MSW server for API mocking
 * - Sets up global DOM matchers
 * - Configures error handling
 */
beforeAll(() => {
  // Start MSW server to intercept API requests
  server.listen({
    onUnhandledRequest: 'warn'
  });

  // Configure console error handling for tests
  const originalError = console.error;
  console.error = (...args) => {
    // Ignore specific React errors that occur during testing
    const suppressedErrors = [
      'Warning: ReactDOM.render is no longer supported',
      'Warning: useLayoutEffect does nothing on the server'
    ];
    if (suppressedErrors.some(msg => args[0]?.includes(msg))) {
      return;
    }
    originalError.call(console, ...args);
  };

  // Configure global fetch timeout
  jest.setTimeout(10000);
});

/**
 * Clean up test environment after all tests complete
 * - Stops MSW server
 * - Restores original console behavior
 * - Cleans up any remaining timeouts
 */
afterAll(() => {
  // Stop MSW server
  server.close();

  // Clear all timers
  jest.clearAllTimers();

  // Restore console behavior
  jest.restoreAllMocks();
});

/**
 * Reset test state between each test
 * - Resets MSW request handlers
 * - Clears any mocked responses
 * - Resets DOM to clean state
 */
afterEach(() => {
  // Reset MSW handlers to default state
  server.resetHandlers();

  // Clear any localStorage data
  window.localStorage.clear();

  // Clear any sessionStorage data
  window.sessionStorage.clear();

  // Reset any pending timers
  jest.clearAllTimers();

  // Clean up any mounted components
  document.body.innerHTML = '';
});

/**
 * Configure global test environment settings
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

/**
 * Mock IntersectionObserver for components using it
 */
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  constructor(callback: IntersectionObserverCallback) {
    // Simulate initial callback with empty entries
    callback([], this);
  }
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver
});

/**
 * Mock ResizeObserver for components using it
 */
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver
});

/**
 * Configure fetch polyfill behavior
 */
Object.defineProperty(window, 'fetch', {
  writable: true,
  value: jest.fn()
});

/**
 * Mock clipboard API
 */
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
    readText: jest.fn().mockImplementation(() => Promise.resolve('')),
    write: jest.fn().mockImplementation(() => Promise.resolve())
  }
});

/**
 * Configure error boundary behavior for testing
 */
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (/React will try to recreate this component tree/.test(args[0])) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

/**
 * Add custom jest matchers
 */
expect.extend({
  toHaveBeenCalledOnceWith(received: jest.Mock, ...expected: any[]) {
    const pass = received.mock.calls.length === 1 &&
      JSON.stringify(received.mock.calls[0]) === JSON.stringify(expected);
    
    return {
      pass,
      message: () => pass
        ? `Expected mock not to have been called once with ${expected}`
        : `Expected mock to have been called once with ${expected}`
    };
  }
});