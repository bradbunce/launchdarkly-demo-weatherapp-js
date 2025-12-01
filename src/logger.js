/**
 * Conditional logging utility that respects the developer-mode flag
 * 
 * Usage:
 *   import { log } from './logger.js';
 *   log('[Component]', 'Message', data);
 */

let developerModeEnabled = false;
let ldClient = null;

/**
 * Initialize the logger with the LaunchDarkly client
 * @param {Object} client - LaunchDarkly client instance
 */
export function initLogger(client) {
  ldClient = client;
  developerModeEnabled = client.variation('developer-mode', false);
  
  // Listen for flag changes
  client.on('change:developer-mode', () => {
    developerModeEnabled = client.variation('developer-mode', false);
  });
}

/**
 * Conditional console.log that only logs when developer-mode is enabled
 * @param {...any} args - Arguments to pass to console.log
 */
export function log(...args) {
  if (developerModeEnabled) {
    console.log(...args);
  }
}

/**
 * Conditional console.warn that only logs when developer-mode is enabled
 * @param {...any} args - Arguments to pass to console.warn
 */
export function warn(...args) {
  if (developerModeEnabled) {
    console.warn(...args);
  }
}

/**
 * Conditional console.error that only logs when developer-mode is enabled
 * @param {...any} args - Arguments to pass to console.error
 */
export function error(...args) {
  if (developerModeEnabled) {
    console.error(...args);
  }
}
