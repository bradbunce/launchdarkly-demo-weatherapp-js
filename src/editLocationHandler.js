/**
 * Edit Location Handler Module
 * Handles the UI and logic for editing existing locations
 */

import { updateLocation, getLocations } from './locationStorage.js';
import { showMessage } from './addLocationHandler.js';
import { showLocationSuccess, showLocationError } from './errorHandler.js';

/**
 * Show edit form for a location
 * @param {string} userEmail - User's email address
 * @param {string} locationId - ID of location to edit
 * @param {Function} onEditSuccess - Callback to execute after successful edit
 * @param {Function} onCancel - Callback to execute when edit is cancelled
 */
export function showEditLocationForm(userEmail, locationId, onEditSuccess, onCancel) {
  // Get the location to edit
  const locations = getLocations(userEmail);
  const location = locations.find(loc => loc.id === locationId);
  
  if (!location) {
    showMessage('Location not found', 'error');
    return;
  }
  
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'edit-location-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  `;
  
  // Create form container
  const formContainer = document.createElement('div');
  formContainer.id = 'edit-location-form-container';
  formContainer.setAttribute('role', 'dialog');
  formContainer.setAttribute('aria-labelledby', 'edit-form-title');
  formContainer.setAttribute('aria-modal', 'true');
  formContainer.style.cssText = `
    background: rgba(30, 30, 50, 0.95);
    border: 2px solid rgba(100, 150, 255, 0.5);
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  `;
  
  // Create form
  const form = document.createElement('form');
  form.id = 'edit-location-form';
  
  // Form title
  const title = document.createElement('h2');
  title.id = 'edit-form-title';
  title.textContent = 'Edit Location';
  title.style.cssText = 'color: white; margin-top: 0; margin-bottom: 20px;';
  form.appendChild(title);
  
  // Location name field
  const nameLabel = document.createElement('label');
  nameLabel.htmlFor = 'edit-location-name';
  nameLabel.textContent = 'Location Name';
  nameLabel.style.cssText = 'display: block; color: white; margin-bottom: 8px; font-size: 14px;';
  form.appendChild(nameLabel);
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'edit-location-name';
  nameInput.name = 'name';
  nameInput.value = location.name;
  nameInput.required = true;
  nameInput.setAttribute('aria-required', 'true');
  nameInput.style.cssText = `
    width: 100%;
    padding: 10px;
    margin-bottom: 16px;
    border: 1px solid rgba(100, 150, 255, 0.3);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 14px;
    box-sizing: border-box;
  `;
  form.appendChild(nameInput);
  
  // Coordinates info (read-only)
  const coordsLabel = document.createElement('label');
  coordsLabel.htmlFor = 'edit-location-coords';
  coordsLabel.textContent = 'Coordinates (cannot be changed)';
  coordsLabel.style.cssText = 'display: block; color: rgba(255, 255, 255, 0.7); margin-bottom: 8px; font-size: 14px;';
  form.appendChild(coordsLabel);
  
  const coordsInput = document.createElement('input');
  coordsInput.type = 'text';
  coordsInput.id = 'edit-location-coords';
  coordsInput.value = `${location.coordinates.latitude.toFixed(4)}, ${location.coordinates.longitude.toFixed(4)}`;
  coordsInput.disabled = true;
  coordsInput.setAttribute('aria-readonly', 'true');
  coordsInput.style.cssText = `
    width: 100%;
    padding: 10px;
    margin-bottom: 20px;
    border: 1px solid rgba(100, 150, 255, 0.2);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    box-sizing: border-box;
    cursor: not-allowed;
  `;
  form.appendChild(coordsInput);
  
  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end;';
  
  // Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.id = 'edit-location-cancel';
  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = `
    padding: 10px 20px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: transparent;
    color: white;
    font-size: 14px;
    cursor: pointer;
  `;
  buttonContainer.appendChild(cancelButton);
  
  // Save button
  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.id = 'edit-location-save';
  saveButton.textContent = 'Save Changes';
  saveButton.style.cssText = `
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    background: rgba(100, 150, 255, 0.8);
    color: white;
    font-size: 14px;
    cursor: pointer;
  `;
  buttonContainer.appendChild(saveButton);
  
  form.appendChild(buttonContainer);
  
  // Handle form submission
  form.onsubmit = (e) => {
    e.preventDefault();
    handleEditLocationSubmit(userEmail, locationId, nameInput.value, location, onEditSuccess);
    overlay.remove();
  };
  
  // Handle cancel
  cancelButton.onclick = () => {
    overlay.remove();
    if (onCancel && typeof onCancel === 'function') {
      onCancel();
    }
  };
  
  // Close on overlay click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (onCancel && typeof onCancel === 'function') {
        onCancel();
      }
    }
  };
  
  // Assemble and show
  formContainer.appendChild(form);
  overlay.appendChild(formContainer);
  document.body.appendChild(overlay);
  
  // Focus the name input
  nameInput.focus();
  nameInput.select();
  
  // Trap focus within dialog
  trapFocus(formContainer);
  
  /**
   * Trap focus within dialog for accessibility
   * @param {HTMLElement} element - Dialog element
   */
  function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
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
 * Handle edit location form submission
 * @param {string} userEmail - User's email address
 * @param {string} locationId - ID of location to update
 * @param {string} newName - New location name
 * @param {Object} originalLocation - Original location data (for comparison)
 * @param {Function} onEditSuccess - Callback to execute after successful edit
 */
export function handleEditLocationSubmit(userEmail, locationId, newName, originalLocation, onEditSuccess) {
  // Validate input
  if (!newName || newName.trim() === '') {
    showMessage('Location name cannot be empty', 'error');
    return;
  }
  
  // Check if name actually changed
  if (newName.trim() === originalLocation.name.trim()) {
    showMessage('No changes made', 'info');
    if (onEditSuccess && typeof onEditSuccess === 'function') {
      onEditSuccess();
    }
    return;
  }
  
  // Update the location
  const result = updateLocation(userEmail, locationId, {
    name: newName.trim()
  });
  
  if (result.success) {
    showLocationSuccess('update', newName);
    showMessage(`✓ ${newName} updated successfully!`, 'success');
    
    // Refresh display with updated data
    if (onEditSuccess && typeof onEditSuccess === 'function') {
      setTimeout(() => {
        onEditSuccess();
      }, 500);
    }
  } else {
    showLocationError('update', result.error);
    showMessage(`Failed to update location: ${result.error}`, 'error');
  }
}

/**
 * Validate edit form inputs
 * @param {Object} formData - Form data to validate
 * @returns {{valid: boolean, errors: Array<string>}}
 */
export function validateEditForm(formData) {
  const errors = [];
  
  if (!formData) {
    errors.push('Form data is required');
    return { valid: false, errors };
  }
  
  if (!formData.name || typeof formData.name !== 'string' || formData.name.trim() === '') {
    errors.push('Location name is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
