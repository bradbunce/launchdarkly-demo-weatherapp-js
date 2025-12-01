/**
 * Add Location Handler Module
 * Handles the UI and logic for adding new locations to favorites
 */

import { saveLocation, locationExists } from './locationStorage.js';
import { showLocationSuccess, showLocationError } from './errorHandler.js';
import { warn } from './logger.js';

/**
 * Create and attach save location button to the UI
 * @param {Object} context - User context (must be named user)
 * @param {Object} weatherData - Current weather data with city information
 * @param {Function} ldClient - LaunchDarkly client for flag evaluation
 * @param {Function} onSaveSuccess - Callback to execute after successful save
 * @returns {HTMLElement|null} The created button element or null if not applicable
 */
export function createSaveLocationButton(context, weatherData, ldClient, onSaveSuccess) {
  // Only show save button for named users
  if (context.anonymous || !context.email) {
    return null;
  }
  
  // Check if save-locations flag is enabled
  const canSaveLocations = ldClient.variation('save-locations', false);
  if (!canSaveLocations) {
    return null;
  }
  
  // Check if location is already saved
  if (locationExists(context.email, weatherData.city)) {
    return null;
  }
  
  // Create save button
  const saveBtn = document.createElement('button');
  saveBtn.id = 'save-location-btn';
  saveBtn.textContent = '⭐ Save Location';
  saveBtn.style.cssText = 'margin-top: 10px; padding: 8px 16px; font-size: 14px;';
  
  // Attach click handler
  saveBtn.onclick = () => {
    handleSaveLocation(context, weatherData, onSaveSuccess);
  };
  
  return saveBtn;
}

/**
 * Handle saving a location to favorites
 * @param {Object} context - User context
 * @param {Object} weatherData - Current weather data
 * @param {Function} onSaveSuccess - Callback to execute after successful save
 */
export function handleSaveLocation(context, weatherData, onSaveSuccess) {
  // Validate user is logged in
  if (context.anonymous || !context.email) {
    showMessage('You must be logged in to save locations', 'error');
    return;
  }
  
  // Create location object with required fields
  const location = {
    name: weatherData.city,
    coordinates: {
      latitude: weatherData.latitude || 0,
      longitude: weatherData.longitude || 0
    },
    query: weatherData.city // Use city name as query
  };
  
  // Validate location data before saving
  if (!location.name || location.name.trim() === '') {
    showMessage('Invalid location: name is required', 'error');
    return;
  }
  
  if (!location.coordinates || 
      typeof location.coordinates.latitude !== 'number' ||
      typeof location.coordinates.longitude !== 'number') {
    showMessage('Invalid location: coordinates are required', 'error');
    return;
  }
  
  // Check for duplicates before adding
  if (locationExists(context.email, location.name)) {
    showMessage('This location is already in your favorites', 'error');
    return;
  }
  
  // Save the location
  const result = saveLocation(context.email, location);
  
  if (result.success) {
    showLocationSuccess('save', location.name);
    showMessage(`✓ ${location.name} saved to favorites!`, 'success');
    
    // Refresh view after successful save
    if (onSaveSuccess && typeof onSaveSuccess === 'function') {
      // Small delay to let user see the success message
      setTimeout(() => {
        onSaveSuccess();
      }, 500);
    }
  } else {
    showLocationError('save', result.error);
    showMessage(`Failed to save location: ${result.error}`, 'error');
  }
}

/**
 * Display a temporary message to the user
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success' or 'error')
 */
export function showMessage(message, type = 'info') {
  // Remove any existing messages
  const existingMessage = document.getElementById('location-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.id = 'location-message';
  messageEl.textContent = message;
  
  // Style based on type
  const bgColor = type === 'success' ? 'rgba(100, 255, 150, 0.3)' : 
                  type === 'error' ? 'rgba(255, 100, 100, 0.3)' : 
                  'rgba(100, 150, 255, 0.3)';
  
  const borderColor = type === 'success' ? 'rgba(100, 255, 150, 0.5)' : 
                      type === 'error' ? 'rgba(255, 100, 100, 0.5)' : 
                      'rgba(100, 150, 255, 0.5)';
  
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${bgColor};
    border: 2px solid ${borderColor};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: slideDown 0.3s ease-out;
  `;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
  
  // Add to document
  document.body.appendChild(messageEl);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    messageEl.style.animation = 'slideDown 0.3s ease-out reverse';
    setTimeout(() => {
      messageEl.remove();
    }, 300);
  }, 3000);
}

/**
 * Attach save location functionality to the weather app
 * This function should be called after the weather search interface is rendered
 * @param {Object} context - User context
 * @param {Object} weatherData - Current weather data
 * @param {Function} ldClient - LaunchDarkly client
 * @param {Function} onSaveSuccess - Callback for successful save
 */
export function attachSaveLocationButton(context, weatherData, ldClient, onSaveSuccess) {
  // Find the location selector container
  const locationSelector = document.querySelector('.location-selector');
  if (!locationSelector) {
    warn('[Add Location] Location selector not found in DOM');
    return;
  }
  
  // Remove any existing save button
  const existingButton = document.getElementById('save-location-btn');
  if (existingButton) {
    existingButton.remove();
  }
  
  // Create and attach new save button if applicable
  const saveBtn = createSaveLocationButton(context, weatherData, ldClient, onSaveSuccess);
  if (saveBtn) {
    locationSelector.appendChild(saveBtn);
  }
}
