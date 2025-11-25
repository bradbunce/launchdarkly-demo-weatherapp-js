/**
 * Delete Location Handler Module
 * Manages the UI and logic for deleting saved locations
 */

import { deleteLocation, getLocations } from './locationStorage.js';
import { determineView } from './viewStateManager.js';
import { showLocationSuccess, showLocationError } from './errorHandler.js';

/**
 * Show delete confirmation dialog
 * @param {string} userEmail - User's email address
 * @param {string} locationId - ID of location to delete
 * @param {Function} onConfirm - Callback when deletion is confirmed
 * @param {Function} onCancel - Callback when deletion is cancelled
 */
export function showDeleteConfirmation(userEmail, locationId, onConfirm, onCancel) {
  // Get the location to display its name
  const locations = getLocations(userEmail);
  const location = locations.find(loc => loc.id === locationId);
  
  if (!location) {
    console.error('[Delete Location] Location not found:', locationId);
    return;
  }
  
  // Create dialog container
  const dialog = document.createElement('div');
  dialog.id = 'delete-confirmation-dialog';
  dialog.className = 'confirmation-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-labelledby', 'delete-dialog-title');
  dialog.setAttribute('aria-modal', 'true');
  
  // Create dialog content
  const dialogContent = document.createElement('div');
  dialogContent.className = 'dialog-content';
  
  // Title
  const title = document.createElement('h2');
  title.id = 'delete-dialog-title';
  title.textContent = 'Delete Location';
  dialogContent.appendChild(title);
  
  // Message
  const message = document.createElement('p');
  message.textContent = `Are you sure you want to delete "${location.name}"? This action cannot be undone.`;
  dialogContent.appendChild(message);
  
  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'dialog-buttons';
  
  // Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.id = 'delete-cancel-button';
  cancelButton.className = 'button-secondary';
  cancelButton.textContent = 'Cancel';
  cancelButton.setAttribute('aria-label', 'Cancel deletion');
  cancelButton.addEventListener('click', () => {
    removeDialog();
    if (onCancel && typeof onCancel === 'function') {
      onCancel();
    }
  });
  buttonContainer.appendChild(cancelButton);
  
  // Confirm button
  const confirmButton = document.createElement('button');
  confirmButton.id = 'delete-confirm-button';
  confirmButton.className = 'button-danger';
  confirmButton.textContent = 'Delete';
  confirmButton.setAttribute('aria-label', `Confirm delete ${location.name}`);
  confirmButton.addEventListener('click', () => {
    removeDialog();
    if (onConfirm && typeof onConfirm === 'function') {
      onConfirm();
    }
  });
  buttonContainer.appendChild(confirmButton);
  
  dialogContent.appendChild(buttonContainer);
  dialog.appendChild(dialogContent);
  
  // Add to document
  document.body.appendChild(dialog);
  
  // Focus the cancel button (safer default)
  cancelButton.focus();
  
  // Trap focus within dialog
  trapFocus(dialog);
  
  console.log('[Delete Location] Confirmation dialog shown for:', location.name);
  
  /**
   * Remove dialog from DOM
   */
  function removeDialog() {
    const existingDialog = document.getElementById('delete-confirmation-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }
  }
  
  /**
   * Trap focus within dialog for accessibility
   * @param {HTMLElement} element - Dialog element
   */
  function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      } else if (e.key === 'Escape') {
        // Allow Escape to cancel
        e.preventDefault();
        cancelButton.click();
      }
    });
  }
}

/**
 * Handle delete location with confirmation
 * @param {string} userEmail - User's email address
 * @param {string} locationId - ID of location to delete
 * @param {Function} onSuccess - Callback when deletion succeeds
 * @param {Function} onError - Optional callback when deletion fails
 */
export function handleDeleteLocation(userEmail, locationId, onSuccess, onError) {
  // Get location name before deletion for success message
  const locations = getLocations(userEmail);
  const locationToDelete = locations.find(loc => loc.id === locationId);
  const locationName = locationToDelete ? locationToDelete.name : 'Location';
  
  // Show confirmation dialog
  showDeleteConfirmation(
    userEmail,
    locationId,
    () => {
      // User confirmed deletion
      const result = deleteLocation(userEmail, locationId);
      
      if (result.success) {
        console.log('[Delete Location] Location deleted successfully');
        showLocationSuccess('delete', locationName);
        
        // Check if we need to transition views
        const remainingLocations = getLocations(userEmail);
        const newView = determineView(
          { email: userEmail, isAnonymous: false },
          remainingLocations.length
        );
        
        // If we deleted the last location (or down to 1), transition to detail view
        if (newView === 'detail' && remainingLocations.length === 0) {
          console.log('[Delete Location] Last location deleted, transitioning to detail view');
        }
        
        // Call success callback
        if (onSuccess && typeof onSuccess === 'function') {
          onSuccess();
        }
      } else {
        console.error('[Delete Location] Delete failed:', result.error);
        
        // Show error message
        showLocationError('delete', result.error || 'Failed to delete location');
        showErrorMessage(result.error || 'Failed to delete location');
        
        // Call error callback
        if (onError && typeof onError === 'function') {
          onError(result.error);
        }
      }
    },
    () => {
      // User cancelled deletion
      console.log('[Delete Location] Deletion cancelled by user');
    }
  );
}

/**
 * Show error message to user
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
  // Create error message element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.setAttribute('role', 'alert');
  
  // Add to document
  document.body.appendChild(errorDiv);
  
  // Remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

/**
 * Attach delete button handler to a container using event delegation
 * @param {HTMLElement} container - Container with delete buttons
 * @param {string} userEmail - User's email address
 * @param {Function} onDeleteSuccess - Callback when deletion succeeds
 */
export function attachDeleteHandlers(container, userEmail, onDeleteSuccess) {
  container.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.delete-button');
    
    if (deleteButton) {
      event.stopPropagation();
      const locationId = deleteButton.dataset.locationId;
      
      if (locationId) {
        handleDeleteLocation(userEmail, locationId, onDeleteSuccess);
      }
    }
  });
}
