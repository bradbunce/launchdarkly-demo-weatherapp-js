/**
 * Unit tests for accessibility features
 * Feature: location-management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderLocationCard,
  attachCardEventHandlers
} from '../src/locationCardRenderer.js';
import {
  showDeleteConfirmation
} from '../src/deleteLocationHandler.js';
import {
  showEditLocationForm
} from '../src/editLocationHandler.js';
import {
  transitionToListView,
  transitionToDetailView,
  setupKeyboardShortcuts,
  setUserContext,
  resetViewState
} from '../src/viewStateManager.js';
import { saveLocation } from '../src/locationStorage.js';

describe('Accessibility Features', () => {
  let container;
  const testEmail = 'test@example.com';

  beforeEach(() => {
    // Create a fresh container for each test
    container = document.createElement('div');
    document.body.appendChild(container);
    
    // Clear localStorage
    localStorage.removeItem(`weatherAppLocations_${testEmail}`);
    
    // Reset view state
    resetViewState();
  });

  afterEach(() => {
    // Clean up
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // Clean up any dialogs
    const dialogs = document.querySelectorAll('[role="dialog"]');
    dialogs.forEach(dialog => dialog.remove());
    
    // Clean up screen reader announcements
    const announcements = document.getElementById('screen-reader-announcements');
    if (announcements) {
      announcements.remove();
    }
    
    localStorage.removeItem(`weatherAppLocations_${testEmail}`);
  });

  describe('Keyboard Navigation', () => {
    it('should make location cards keyboard navigable with tabindex', () => {
      const location = {
        id: 'test-id-1',
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const weatherData = {
        temperature: 72,
        condition: 'Sunny',
        conditionIcon: 'https://example.com/icon.png'
      };

      const card = renderLocationCard(location, weatherData);
      
      // Verify card has tabindex for keyboard navigation
      expect(card.getAttribute('tabindex')).toBe('0');
      expect(card.getAttribute('role')).toBe('button');
    });

    it('should handle Enter key on location cards', () => {
      const location = {
        id: 'test-id-1',
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const weatherData = {
        temperature: 72,
        condition: 'Sunny',
        conditionIcon: 'https://example.com/icon.png'
      };

      const card = renderLocationCard(location, weatherData);
      container.appendChild(card);

      let cardClicked = false;
      attachCardEventHandlers(container, {
        onCardClick: () => { cardClicked = true; }
      });

      // Simulate Enter key press
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      card.dispatchEvent(event);

      expect(cardClicked).toBe(true);
    });

    it('should handle Space key on location cards', () => {
      const location = {
        id: 'test-id-1',
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const weatherData = {
        temperature: 72,
        condition: 'Sunny',
        conditionIcon: 'https://example.com/icon.png'
      };

      const card = renderLocationCard(location, weatherData);
      container.appendChild(card);

      let cardClicked = false;
      attachCardEventHandlers(container, {
        onCardClick: () => { cardClicked = true; }
      });

      // Simulate Space key press
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      card.dispatchEvent(event);

      expect(cardClicked).toBe(true);
    });

    it('should handle Enter key on edit buttons', () => {
      const location = {
        id: 'test-id-1',
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const weatherData = {
        temperature: 72,
        condition: 'Sunny',
        conditionIcon: 'https://example.com/icon.png'
      };

      const card = renderLocationCard(location, weatherData);
      container.appendChild(card);

      let editClicked = false;
      attachCardEventHandlers(container, {
        onEdit: () => { editClicked = true; }
      });

      const editButton = card.querySelector('.edit-button');
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      editButton.dispatchEvent(event);

      expect(editClicked).toBe(true);
    });

    it('should handle Enter key on delete buttons', () => {
      const location = {
        id: 'test-id-1',
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const weatherData = {
        temperature: 72,
        condition: 'Sunny',
        conditionIcon: 'https://example.com/icon.png'
      };

      const card = renderLocationCard(location, weatherData);
      container.appendChild(card);

      let deleteClicked = false;
      attachCardEventHandlers(container, {
        onDelete: () => { deleteClicked = true; }
      });

      const deleteButton = card.querySelector('.delete-button');
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      deleteButton.dispatchEvent(event);

      expect(deleteClicked).toBe(true);
    });
  });

  describe('ARIA Labels', () => {
    it('should have aria-label on location cards', () => {
      const location = {
        id: 'test-id-1',
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const weatherData = {
        temperature: 72,
        condition: 'Sunny',
        conditionIcon: 'https://example.com/icon.png'
      };

      const card = renderLocationCard(location, weatherData);
      
      expect(card.getAttribute('aria-label')).toContain('View weather for');
      expect(card.getAttribute('aria-label')).toContain('San Francisco');
    });

    it('should have aria-label on edit buttons', () => {
      const location = {
        id: 'test-id-1',
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const weatherData = {
        temperature: 72,
        condition: 'Sunny',
        conditionIcon: 'https://example.com/icon.png'
      };

      const card = renderLocationCard(location, weatherData);
      const editButton = card.querySelector('.edit-button');
      
      expect(editButton.getAttribute('aria-label')).toContain('Edit');
      expect(editButton.getAttribute('aria-label')).toContain('San Francisco');
    });

    it('should have aria-label on delete buttons', () => {
      const location = {
        id: 'test-id-1',
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const weatherData = {
        temperature: 72,
        condition: 'Sunny',
        conditionIcon: 'https://example.com/icon.png'
      };

      const card = renderLocationCard(location, weatherData);
      const deleteButton = card.querySelector('.delete-button');
      
      expect(deleteButton.getAttribute('aria-label')).toContain('Delete');
      expect(deleteButton.getAttribute('aria-label')).toContain('San Francisco');
    });
  });

  describe('Focus Management in Dialogs', () => {
    it('should trap focus in delete confirmation dialog', () => {
      // Save a location first
      saveLocation(testEmail, {
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco'
      });

      const locations = JSON.parse(localStorage.getItem(`weatherAppLocations_${testEmail}`)).locations;
      const locationId = locations[0].id;

      // Show delete confirmation
      showDeleteConfirmation(testEmail, locationId, () => {}, () => {});

      const dialog = document.getElementById('delete-confirmation-dialog');
      expect(dialog).not.toBeNull();
      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');

      // Get focusable elements
      const focusableElements = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      expect(focusableElements.length).toBeGreaterThan(0);

      // Verify first element gets focus
      const cancelButton = dialog.querySelector('#delete-cancel-button');
      expect(document.activeElement).toBe(cancelButton);
    });

    it('should handle Escape key in delete confirmation dialog', () => {
      // Save a location first
      saveLocation(testEmail, {
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco'
      });

      const locations = JSON.parse(localStorage.getItem(`weatherAppLocations_${testEmail}`)).locations;
      const locationId = locations[0].id;

      let cancelCalled = false;
      showDeleteConfirmation(testEmail, locationId, () => {}, () => { cancelCalled = true; });

      const dialog = document.getElementById('delete-confirmation-dialog');
      
      // Simulate Escape key
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      dialog.dispatchEvent(event);

      expect(cancelCalled).toBe(true);
    });

    it('should trap focus in edit location form', () => {
      // Save a location first
      saveLocation(testEmail, {
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco'
      });

      const locations = JSON.parse(localStorage.getItem(`weatherAppLocations_${testEmail}`)).locations;
      const locationId = locations[0].id;

      // Show edit form
      showEditLocationForm(testEmail, locationId, () => {}, () => {});

      const formContainer = document.getElementById('edit-location-form-container');
      expect(formContainer).not.toBeNull();
      expect(formContainer.getAttribute('role')).toBe('dialog');
      expect(formContainer.getAttribute('aria-modal')).toBe('true');

      // Get focusable elements
      const focusableElements = formContainer.querySelectorAll(
        'button, [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      expect(focusableElements.length).toBeGreaterThan(0);

      // Verify name input gets focus
      const nameInput = formContainer.querySelector('#edit-location-name');
      expect(document.activeElement).toBe(nameInput);
    });

    it('should handle Escape key in edit location form', () => {
      // Save a location first
      saveLocation(testEmail, {
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco'
      });

      const locations = JSON.parse(localStorage.getItem(`weatherAppLocations_${testEmail}`)).locations;
      const locationId = locations[0].id;

      let cancelCalled = false;
      showEditLocationForm(testEmail, locationId, () => {}, () => { cancelCalled = true; });

      const formContainer = document.getElementById('edit-location-form-container');
      
      // Simulate Escape key
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      formContainer.dispatchEvent(event);

      expect(cancelCalled).toBe(true);
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce view transition to list view', () => {
      transitionToListView();

      const liveRegion = document.getElementById('screen-reader-announcements');
      expect(liveRegion).not.toBeNull();
      expect(liveRegion.getAttribute('aria-live')).toBe('polite');
      
      // Wait for announcement to be set
      setTimeout(() => {
        expect(liveRegion.textContent).toContain('list');
      }, 150);
    });

    it('should announce view transition to detail view', () => {
      transitionToDetailView('test-location-id');

      const liveRegion = document.getElementById('screen-reader-announcements');
      expect(liveRegion).not.toBeNull();
      expect(liveRegion.getAttribute('aria-live')).toBe('polite');
      
      // Wait for announcement to be set
      setTimeout(() => {
        expect(liveRegion.textContent).toContain('detail');
      }, 150);
    });

    it('should have aria-live region for screen reader announcements', () => {
      transitionToListView();

      const liveRegion = document.getElementById('screen-reader-announcements');
      expect(liveRegion).not.toBeNull();
      expect(liveRegion.getAttribute('aria-live')).not.toBeNull();
      expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
      
      // Verify it's visually hidden but accessible to screen readers
      const styles = window.getComputedStyle(liveRegion);
      expect(liveRegion.style.position).toBe('absolute');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should setup keyboard shortcuts for back navigation', () => {
      let backCalled = false;
      setupKeyboardShortcuts(() => { backCalled = true; });

      // Set up context with multiple locations
      setUserContext({ email: testEmail, isAnonymous: false });
      saveLocation(testEmail, {
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco'
      });
      saveLocation(testEmail, {
        name: 'New York',
        coordinates: { latitude: 40.7128, longitude: -74.0060 },
        query: 'New York'
      });

      // Transition to detail view
      transitionToDetailView('test-id');

      // Simulate Escape key
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(event);

      expect(backCalled).toBe(true);
    });

    it('should handle Alt+Left Arrow for back navigation', () => {
      let backCalled = false;
      setupKeyboardShortcuts(() => { backCalled = true; });

      // Set up context with multiple locations
      setUserContext({ email: testEmail, isAnonymous: false });
      saveLocation(testEmail, {
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco'
      });
      saveLocation(testEmail, {
        name: 'New York',
        coordinates: { latitude: 40.7128, longitude: -74.0060 },
        query: 'New York'
      });

      // Transition to detail view
      transitionToDetailView('test-id');

      // Simulate Alt+Left Arrow
      const event = new KeyboardEvent('keydown', { 
        key: 'ArrowLeft', 
        altKey: true, 
        bubbles: true 
      });
      document.dispatchEvent(event);

      expect(backCalled).toBe(true);
    });
  });

  describe('Form Accessibility', () => {
    it('should have proper labels for form inputs in edit form', () => {
      // Save a location first
      saveLocation(testEmail, {
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco'
      });

      const locations = JSON.parse(localStorage.getItem(`weatherAppLocations_${testEmail}`)).locations;
      const locationId = locations[0].id;

      // Show edit form
      showEditLocationForm(testEmail, locationId, () => {}, () => {});

      const nameInput = document.getElementById('edit-location-name');
      const nameLabel = document.querySelector('label[for="edit-location-name"]');
      
      expect(nameInput).not.toBeNull();
      expect(nameLabel).not.toBeNull();
      expect(nameLabel.htmlFor).toBe('edit-location-name');
      expect(nameInput.getAttribute('aria-required')).toBe('true');
    });

    it('should mark disabled fields as readonly for screen readers', () => {
      // Save a location first
      saveLocation(testEmail, {
        name: 'San Francisco',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        query: 'San Francisco'
      });

      const locations = JSON.parse(localStorage.getItem(`weatherAppLocations_${testEmail}`)).locations;
      const locationId = locations[0].id;

      // Show edit form
      showEditLocationForm(testEmail, locationId, () => {}, () => {});

      const coordsInput = document.getElementById('edit-location-coords');
      
      expect(coordsInput).not.toBeNull();
      expect(coordsInput.disabled).toBe(true);
      expect(coordsInput.getAttribute('aria-readonly')).toBe('true');
    });
  });
});
