// Test setup file for vitest
import { beforeEach, afterEach } from 'vitest';
import { initLogger } from '../src/logger.js';

// Initialize logger with a mock client that has developer-mode enabled
// This ensures all logging works in tests
const mockLDClient = {
  variation: (flagKey, defaultValue) => {
    if (flagKey === 'developer-mode') return true;
    return defaultValue;
  },
  on: () => {} // No-op for event listeners
};

initLogger(mockLDClient);

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
});

// Clean up after each test
afterEach(() => {
  localStorage.clear();
});
