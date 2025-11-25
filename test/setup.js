// Test setup file for vitest
import { beforeEach, afterEach } from 'vitest';

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
});

// Clean up after each test
afterEach(() => {
  localStorage.clear();
});
