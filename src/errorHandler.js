/**
 * Error Handler and User Feedback Module
 * Handles error display, loading states, success messages, and retry functionality
 */

import { log, error as logError } from './logger.js';

/**
 * Display a toast notification to the user
 * @param {string} message - Message to display
 * @param {string} type - Type of message: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (0 for persistent)
 * @returns {HTMLElement} Toast element
 */
export function showToast(message, type = 'info', duration = 3000) {
  // Create toast container if it doesn't exist
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  
  container.appendChild(toast);
  
  log(`[User Feedback] Toast displayed: ${type} - ${message}`);
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }
  
  return toast;
}

/**
 * Display a loading indicator
 * @param {HTMLElement} container - Container element to show loading in
 * @param {string} message - Optional loading message
 * @returns {HTMLElement} Loading element
 */
export function showLoading(container, message = 'Loading...') {
  const loading = document.createElement('div');
  loading.className = 'loading-indicator';
  loading.setAttribute('role', 'status');
  loading.setAttribute('aria-live', 'polite');
  
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  loading.appendChild(spinner);
  
  if (message) {
    const text = document.createElement('div');
    text.className = 'loading-text';
    text.textContent = message;
    loading.appendChild(text);
  }
  
  container.appendChild(loading);
  
  log(`[User Feedback] Loading indicator shown: ${message}`);
  
  return loading;
}

/**
 * Hide a loading indicator
 * @param {HTMLElement} loadingElement - Loading element to hide
 */
export function hideLoading(loadingElement) {
  if (loadingElement && loadingElement.parentNode) {
    loadingElement.parentNode.removeChild(loadingElement);
    log('[User Feedback] Loading indicator hidden');
  }
}

/**
 * Display a staleness indicator on a card or element
 * @param {HTMLElement} element - Element to add staleness indicator to
 * @param {string} lastUpdated - ISO timestamp of last update
 * @returns {HTMLElement} Staleness indicator element
 */
export function showStalenessIndicator(element, lastUpdated) {
  // Remove existing staleness indicator if present
  const existing = element.querySelector('.staleness-indicator');
  if (existing) {
    existing.remove();
  }
  
  const indicator = document.createElement('div');
  indicator.className = 'staleness-indicator';
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-label', 'Weather data may be outdated');
  
  const icon = document.createElement('span');
  icon.className = 'staleness-icon';
  icon.textContent = '⚠️';
  indicator.appendChild(icon);
  
  const text = document.createElement('span');
  text.className = 'staleness-text';
  text.textContent = `Last updated: ${formatTimestamp(lastUpdated)}`;
  indicator.appendChild(text);
  
  element.appendChild(indicator);
  
  log(`[User Feedback] Staleness indicator shown for: ${lastUpdated}`);
  
  return indicator;
}

/**
 * Format a timestamp for display
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {string} Formatted time string
 */
function formatTimestamp(isoTimestamp) {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
}

/**
 * Display an error message with optional retry button
 * @param {HTMLElement} container - Container element to show error in
 * @param {string} message - Error message
 * @param {Function} onRetry - Optional retry callback
 * @returns {HTMLElement} Error element
 */
export function showError(container, message, onRetry = null) {
  const error = document.createElement('div');
  error.className = 'error-message';
  error.setAttribute('role', 'alert');
  error.setAttribute('aria-live', 'assertive');
  
  const icon = document.createElement('span');
  icon.className = 'error-icon';
  icon.textContent = '❌';
  error.appendChild(icon);
  
  const text = document.createElement('div');
  text.className = 'error-text';
  text.textContent = message;
  error.appendChild(text);
  
  if (onRetry) {
    const retryButton = document.createElement('button');
    retryButton.className = 'retry-button';
    retryButton.textContent = 'Retry';
    retryButton.setAttribute('aria-label', 'Retry loading weather data');
    retryButton.addEventListener('click', () => {
      log('[User Feedback] Retry button clicked');
      onRetry();
    });
    error.appendChild(retryButton);
  }
  
  container.appendChild(error);
  
  log(`[User Feedback] Error displayed: ${message}`);
  
  return error;
}

/**
 * Handle localStorage quota exceeded error
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export function handleStorageQuotaError(error) {
  const message = 'Storage limit reached. Some locations may not be saved.';
  error('[Location Storage] Quota exceeded:', error);
  showToast(message, 'warning', 5000);
  return message;
}

/**
 * Handle WeatherAPI failure
 * @param {Error} error - The error object
 * @param {string} locationName - Name of the location
 * @returns {string} User-friendly error message
 */
export function handleWeatherAPIError(error, locationName = 'this location') {
  const message = `Unable to load weather data for ${locationName}. Using cached data if available.`;
  logError('[Weather API] Fetch failed:', error);
  showToast(message, 'error', 4000);
  return message;
}

/**
 * Show success message for location operations
 * @param {string} operation - Operation type: 'save', 'update', 'delete'
 * @param {string} locationName - Name of the location
 */
export function showLocationSuccess(operation, locationName) {
  let message;
  switch (operation) {
    case 'save':
      message = `${locationName} added to favorites`;
      break;
    case 'update':
      message = `${locationName} updated successfully`;
      break;
    case 'delete':
      message = `${locationName} removed from favorites`;
      break;
    default:
      message = 'Operation completed successfully';
  }
  
  showToast(message, 'success', 3000);
  log(`[User Feedback] Success: ${operation} - ${locationName}`);
}

/**
 * Show error message for location operations
 * @param {string} operation - Operation type: 'save', 'update', 'delete'
 * @param {string} errorMessage - Error message
 */
export function showLocationError(operation, errorMessage) {
  showToast(errorMessage, 'error', 4000);
  error(`[User Feedback] Error: ${operation} - ${errorMessage}`);
}

/**
 * Create a retry wrapper for async functions
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Function} Wrapped function with retry logic
 */
export function withRetry(fn, maxRetries = 3, delay = 1000) {
  return async function(...args) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        log(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1}`);
        return await fn(...args);
      } catch (error) {
        lastError = error;
        warn(`[Retry] Attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < maxRetries) {
          log(`[Retry] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    error('[Retry] All attempts failed:', lastError);
    throw lastError;
  };
}

/**
 * Clear all toast notifications
 */
export function clearToasts() {
  const container = document.getElementById('toast-container');
  if (container) {
    container.innerHTML = '';
  }
}
