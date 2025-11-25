/**
 * Authentication-Location Integration Module
 * Integrates location management with the authentication system
 * Handles user context, login/logout behavior, and UI visibility
 */

import { loadLocations, getLocations } from './locationStorage.js';
import { setUserContext, determineView, resetViewState } from './viewStateManager.js';

/**
 * Check if user is named (not anonymous)
 * @param {Object} context - LaunchDarkly user context
 * @returns {boolean} True if user is named
 */
export function isNamedUser(context) {
  return !!(context && !context.anonymous && context.email);
}

/**
 * Check if user is anonymous
 * @param {Object} context - LaunchDarkly user context
 * @returns {boolean} True if user is anonymous
 */
export function isAnonymousUser(context) {
  return !context || context.anonymous || !context.email;
}

/**
 * Verify authentication before location operations
 * @param {Object} context - LaunchDarkly user context
 * @param {string} operation - Operation name (for logging)
 * @returns {boolean} True if user is authenticated
 */
export function verifyAuthentication(context, operation = 'location operation') {
  if (isAnonymousUser(context)) {
    console.warn(`[Auth Integration] ${operation} blocked: user is anonymous`);
    return false;
  }
  return true;
}

/**
 * Handle user login - load saved locations and update view state
 * @param {Object} context - LaunchDarkly user context
 * @param {Function} ldClient - LaunchDarkly client for flag evaluation
 * @param {Function} onLoginComplete - Callback after login processing
 * @returns {Object} Login result with locations and view
 */
export function handleLogin(context, ldClient, onLoginComplete) {
  console.log('[Auth Integration] Handling login:', { email: context.email });
  
  // Verify user is named
  if (isAnonymousUser(context)) {
    console.warn('[Auth Integration] Login failed: user is anonymous');
    return {
      success: false,
      error: 'User is anonymous'
    };
  }
  
  // Check if save-locations flag is enabled
  const canSaveLocations = ldClient ? ldClient.variation('save-locations', false) : false;
  
  // Set user context in view state manager
  setUserContext({
    email: context.email,
    isAnonymous: false
  });
  
  // Load saved locations from localStorage
  const locations = loadLocations(context.email);
  
  // Determine appropriate view
  const view = determineView(
    { email: context.email, isAnonymous: false },
    locations.length,
    ldClient
  );
  
  console.log('[Auth Integration] Login complete:', {
    email: context.email,
    locationCount: locations.length,
    view,
    canSaveLocations
  });
  
  // Execute callback if provided
  if (onLoginComplete && typeof onLoginComplete === 'function') {
    onLoginComplete({
      locations,
      view,
      canSaveLocations
    });
  }
  
  return {
    success: true,
    locations,
    view,
    canSaveLocations
  };
}

/**
 * Handle user logout - preserve locations but hide UI
 * @param {Function} onLogoutComplete - Callback after logout processing
 * @returns {Object} Logout result
 */
export function handleLogout(onLogoutComplete) {
  console.log('[Auth Integration] Handling logout');
  
  // Note: We do NOT delete locations from localStorage
  // They are preserved for when the user logs back in
  
  // Reset view state to anonymous user defaults
  setUserContext({
    email: null,
    isAnonymous: true
  });
  
  // Reset view to detail (anonymous users always see detail view)
  resetViewState();
  
  console.log('[Auth Integration] Logout complete: locations preserved, UI hidden');
  
  // Execute callback if provided
  if (onLogoutComplete && typeof onLogoutComplete === 'function') {
    onLogoutComplete();
  }
  
  return {
    success: true,
    message: 'Logged out successfully, locations preserved'
  };
}

/**
 * Check if location management UI should be visible
 * @param {Object} context - LaunchDarkly user context
 * @param {Function} ldClient - LaunchDarkly client for flag evaluation
 * @returns {boolean} True if UI should be visible
 */
export function shouldShowLocationManagementUI(context, ldClient) {
  // Check if user is named
  if (isAnonymousUser(context)) {
    return false;
  }
  
  // Check if save-locations flag is enabled
  const canSaveLocations = ldClient ? ldClient.variation('save-locations', false) : false;
  if (!canSaveLocations) {
    return false;
  }
  
  return true;
}

/**
 * Hide all location management UI elements
 * This should be called when user logs out or becomes anonymous
 */
export function hideLocationManagementUI() {
  console.log('[Auth Integration] Hiding location management UI');
  
  // Hide save location button
  const saveBtn = document.getElementById('save-location-btn');
  if (saveBtn) {
    saveBtn.style.display = 'none';
  }
  
  // Hide location list view
  const locationList = document.querySelector('.location-list');
  if (locationList) {
    locationList.style.display = 'none';
  }
  
  // Hide edit buttons
  const editButtons = document.querySelectorAll('.edit-button');
  editButtons.forEach(btn => {
    btn.style.display = 'none';
  });
  
  // Hide delete buttons
  const deleteButtons = document.querySelectorAll('.delete-button');
  deleteButtons.forEach(btn => {
    btn.style.display = 'none';
  });
  
  // Hide back button
  const backButton = document.getElementById('back-to-list-btn');
  if (backButton) {
    backButton.style.display = 'none';
  }
}

/**
 * Show location management UI elements for named users
 * This should be called when user logs in
 * @param {Object} context - LaunchDarkly user context
 * @param {Function} ldClient - LaunchDarkly client for flag evaluation
 */
export function showLocationManagementUI(context, ldClient) {
  if (!shouldShowLocationManagementUI(context, ldClient)) {
    hideLocationManagementUI();
    return;
  }
  
  console.log('[Auth Integration] Showing location management UI');
  
  // Show save location button (if it exists)
  const saveBtn = document.getElementById('save-location-btn');
  if (saveBtn) {
    saveBtn.style.display = '';
  }
  
  // Show location list view (if it exists)
  const locationList = document.querySelector('.location-list');
  if (locationList) {
    locationList.style.display = '';
  }
  
  // Show edit buttons
  const editButtons = document.querySelectorAll('.edit-button');
  editButtons.forEach(btn => {
    btn.style.display = '';
  });
  
  // Show delete buttons
  const deleteButtons = document.querySelectorAll('.delete-button');
  deleteButtons.forEach(btn => {
    btn.style.display = '';
  });
}

/**
 * Initialize authentication integration
 * Sets up event listeners and initial state
 * @param {Object} context - Initial LaunchDarkly user context
 * @param {Function} ldClient - LaunchDarkly client
 * @param {Object} callbacks - Callbacks for login/logout events
 */
export function initializeAuthIntegration(context, ldClient, callbacks = {}) {
  console.log('[Auth Integration] Initializing with context:', {
    email: context?.email,
    anonymous: context?.anonymous
  });
  
  // Set initial user context
  setUserContext({
    email: context?.email || null,
    isAnonymous: isAnonymousUser(context)
  });
  
  // If user is named, load their locations
  if (isNamedUser(context)) {
    handleLogin(context, ldClient, callbacks.onLogin);
  } else {
    // Hide UI for anonymous users
    hideLocationManagementUI();
  }
  
  // Set up real-time flag change handling for save-locations flag
  if (ldClient && callbacks.onFlagChange) {
    ldClient.on('change:save-locations', () => {
      const newFlagValue = ldClient.variation('save-locations', false);
      console.log('[Auth Integration] save-locations flag changed:', newFlagValue);
      
      // Call the flag change callback
      callbacks.onFlagChange(newFlagValue);
    });
  }
  
  return {
    isNamed: isNamedUser(context),
    canManageLocations: shouldShowLocationManagementUI(context, ldClient)
  };
}
