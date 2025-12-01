/**
 * View State Manager Module
 * Controls transitions between list view and detail view based on user actions and location count
 */

import { getLocations } from './locationStorage.js';
import { log } from './logger.js';

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - Priority level ('polite' or 'assertive')
 */
function announceToScreenReader(message, priority = 'polite') {
  // Create or get existing live region
  let liveRegion = document.getElementById('screen-reader-announcements');
  
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'screen-reader-announcements';
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(liveRegion);
  }
  
  // Update priority if different
  if (liveRegion.getAttribute('aria-live') !== priority) {
    liveRegion.setAttribute('aria-live', priority);
  }
  
  // Clear and set new message
  liveRegion.textContent = '';
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 100);
  
  log('[View State] Screen reader announcement:', message);
}

/**
 * View state object
 */
let viewState = {
  currentView: 'detail', // 'list' | 'detail'
  selectedLocationId: null,
  user: {
    email: null,
    isAnonymous: true
  }
};

/**
 * Get current view state
 * @returns {Object} Current view state
 */
export function getViewState() {
  return { ...viewState };
}

/**
 * Set user context
 * @param {Object} user - User object with email and isAnonymous
 */
export function setUserContext(user) {
  viewState.user = {
    email: user.email || null,
    isAnonymous: user.isAnonymous !== false
  };
  log('[View State] User context set:', viewState.user);
}

/**
 * Determine which view to display based on location count and user type
 * @param {Object} user - User object with email and isAnonymous
 * @param {number} locationCount - Number of saved locations
 * @param {Function} ldClient - Optional LaunchDarkly client for flag evaluation
 * @returns {'list' | 'detail'} View type to display
 */
export function determineView(user, locationCount, ldClient = null) {
  // Check if save-locations flag is enabled
  const canSaveLocations = ldClient ? ldClient.variation('save-locations', false) : false;
  
  // If save-locations flag is false, always show detail view
  if (!canSaveLocations) {
    log('[View State] save-locations flag disabled - detail view');
    return 'detail';
  }
  
  // Anonymous users always see detail view
  if (user.isAnonymous) {
    log('[View State] Anonymous user - detail view');
    return 'detail';
  }
  
  // Named users with 2+ locations see list view
  if (locationCount >= 2) {
    log('[View State] Multiple locations - list view');
    return 'list';
  }
  
  // Named users with 0 or 1 location see detail view
  log('[View State] Single or no locations - detail view');
  return 'detail';
}

/**
 * Determine if back button should be visible
 * @param {string} currentView - Current view ('list' or 'detail')
 * @param {number} locationCount - Number of saved locations
 * @returns {boolean} True if back button should be visible
 */
export function shouldShowBackButton(currentView, locationCount) {
  // Back button only visible in detail view when user has multiple locations
  return currentView === 'detail' && locationCount >= 2;
}

/**
 * Update URL/history state to reflect current view
 * @param {string} view - View type ('list' or 'detail')
 * @param {string|null} locationId - Location ID for detail view
 */
function updateURLState(view, locationId = null) {
  if (view === 'list') {
    window.location.hash = '#locations';
  } else if (view === 'detail' && locationId) {
    window.location.hash = `#location/${locationId}`;
  } else {
    window.location.hash = '';
  }
  log('[View State] URL updated:', window.location.hash);
}

/**
 * Transition to list view
 * @param {Function} renderCallback - Optional callback to render the list view
 */
export function transitionToListView(renderCallback) {
  log('[View State] Transition:', { from: viewState.currentView, to: 'list' });
  
  viewState.currentView = 'list';
  viewState.selectedLocationId = null;
  
  updateURLState('list');
  
  // Announce view transition to screen readers
  announceToScreenReader('Showing list of saved locations', 'polite');
  
  if (renderCallback && typeof renderCallback === 'function') {
    renderCallback();
  }
}

/**
 * Transition to detail view for a specific location
 * @param {string} locationId - ID of location to display
 * @param {Function} renderCallback - Optional callback to render the detail view
 */
export function transitionToDetailView(locationId, renderCallback) {
  log('[View State] Transition:', { 
    from: viewState.currentView, 
    to: 'detail', 
    locationId 
  });
  
  viewState.currentView = 'detail';
  viewState.selectedLocationId = locationId;
  
  updateURLState('detail', locationId);
  
  // Announce view transition to screen readers
  announceToScreenReader('Showing detailed weather view', 'polite');
  
  if (renderCallback && typeof renderCallback === 'function') {
    renderCallback(locationId);
  }
}

/**
 * Handle back navigation from detail view to list view
 * @param {Function} renderCallback - Optional callback to render the list view
 */
export function handleBackNavigation(renderCallback) {
  if (viewState.currentView === 'detail') {
    transitionToListView(renderCallback);
  }
}

/**
 * Handle browser back/forward button navigation
 */
export function setupHistoryNavigation(listViewCallback, detailViewCallback) {
  window.addEventListener('popstate', () => {
    const hash = window.location.hash;
    
    if (hash === '#locations') {
      viewState.currentView = 'list';
      viewState.selectedLocationId = null;
      if (listViewCallback) listViewCallback();
    } else if (hash.startsWith('#location/')) {
      const locationId = hash.replace('#location/', '');
      viewState.currentView = 'detail';
      viewState.selectedLocationId = locationId;
      if (detailViewCallback) detailViewCallback(locationId);
    }
    
    log('[View State] History navigation:', viewState);
  });
}

/**
 * Handle location card click event
 * @param {string} locationId - ID of clicked location
 * @param {Function} renderCallback - Optional callback to render the detail view
 */
export function handleCardClick(locationId, renderCallback) {
  if (viewState.currentView === 'list') {
    transitionToDetailView(locationId, renderCallback);
  }
}

/**
 * Setup keyboard shortcuts for navigation
 * @param {Function} backCallback - Callback for back navigation
 */
export function setupKeyboardShortcuts(backCallback) {
  document.addEventListener('keydown', (event) => {
    // Check for Escape key or Alt+Left Arrow for back navigation
    if (event.key === 'Escape' || (event.altKey && event.key === 'ArrowLeft')) {
      // Only trigger if we're in detail view and have multiple locations
      if (viewState.currentView === 'detail') {
        const userEmail = viewState.user.email;
        if (userEmail && !viewState.user.isAnonymous) {
          const locations = getLocations(userEmail);
          if (locations.length >= 2) {
            event.preventDefault();
            log('[View State] Keyboard shortcut triggered: back navigation');
            if (backCallback && typeof backCallback === 'function') {
              backCallback();
            }
          }
        }
      }
    }
  });
  
  log('[View State] Keyboard shortcuts enabled (Escape or Alt+Left for back)');
}

/**
 * Reset view state (useful for testing)
 */
export function resetViewState() {
  viewState = {
    currentView: 'detail',
    selectedLocationId: null,
    user: {
      email: null,
      isAnonymous: true
    }
  };
  window.location.hash = '';
}
