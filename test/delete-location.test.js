/**
 * Property-based tests for delete location functionality
 * Feature: location-management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';
import {
  saveLocation,
  getLocations,
  deleteLocation,
  clearInMemoryStorage
} from '../src/locationStorage.js';
import {
  showDeleteConfirmation,
  handleDeleteLocation
} from '../src/deleteLocationHandler.js';
import {
  determineView,
  setUserContext,
  getViewState
} from '../src/viewStateManager.js';

// Setup DOM environment
let dom;
let document;
let window;

beforeEach(() => {
  // Create a new JSDOM instance for each test
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true
  });
  document = dom.window.document;
  window = dom.window;
  
  // Set global document and window
  global.document = document;
  global.window = window;
  
  // Clear storage
  localStorage.clear();
  clearInMemoryStorage();
});

afterEach(() => {
  // Clean up
  if (dom) {
    dom.window.close();
  }
  global.document = undefined;
  global.window = undefined;
});

describe('Delete Location Functionality', () => {
  /**
   * Feature: location-management, Property 27: Deletion confirmation dialog
   * Validates: Requirements 6.2
   * 
   * Property: For any delete button click, a confirmation dialog should be displayed 
   * before any deletion occurs
   */
  it('Property 27: Deletion confirmation dialog', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          coordinates: fc.record({
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true })
          }),
          query: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
        }),
        (userEmail, location) => {
          // Clear storage and DOM
          localStorage.clear();
          clearInMemoryStorage();
          document.body.innerHTML = '';
          
          // Save a location first
          const saveResult = saveLocation(userEmail, location);
          expect(saveResult.success).toBe(true);
          
          // Get the saved location (with ID)
          const locations = getLocations(userEmail);
          expect(locations.length).toBe(1);
          const savedLocation = locations[0];
          
          // Show delete confirmation dialog
          showDeleteConfirmation(userEmail, savedLocation.id, () => {}, () => {});
          
          // Verify confirmation dialog exists
          const dialog = document.getElementById('delete-confirmation-dialog');
          expect(dialog).not.toBeNull();
          
          // Verify dialog contains location name
          const dialogText = dialog.textContent || dialog.innerText;
          expect(dialogText).toContain(savedLocation.name);
          
          // Verify confirm and cancel buttons exist
          const confirmButton = document.getElementById('delete-confirm-button');
          expect(confirmButton).not.toBeNull();
          
          const cancelButton = document.getElementById('delete-cancel-button');
          expect(cancelButton).not.toBeNull();
          
          // Verify location has NOT been deleted yet (confirmation not clicked)
          const locationsAfterDialog = getLocations(userEmail);
          expect(locationsAfterDialog.length).toBe(1);
          expect(locationsAfterDialog[0].id).toBe(savedLocation.id);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 28: Location removal from storage
   * Validates: Requirements 6.3
   * 
   * Property: For any confirmed deletion, the location should no longer exist 
   * in localStorage for that user
   */
  it('Property 28: Location removal from storage', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          coordinates: fc.record({
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true })
          }),
          query: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
        }),
        (userEmail, location) => {
          // Clear storage
          localStorage.clear();
          clearInMemoryStorage();
          
          // Save a location first
          const saveResult = saveLocation(userEmail, location);
          expect(saveResult.success).toBe(true);
          
          // Get the saved location
          const locationsBefore = getLocations(userEmail);
          expect(locationsBefore.length).toBe(1);
          const savedLocation = locationsBefore[0];
          
          // Delete the location
          const deleteResult = deleteLocation(userEmail, savedLocation.id);
          expect(deleteResult.success).toBe(true);
          
          // Verify location no longer exists in storage
          const locationsAfter = getLocations(userEmail);
          expect(locationsAfter.length).toBe(0);
          
          // Verify it's not in localStorage
          const key = `weatherAppLocations_${userEmail}`;
          const stored = localStorage.getItem(key);
          expect(stored).not.toBeNull();
          
          const data = JSON.parse(stored);
          expect(data.locations).toBeDefined();
          expect(data.locations.length).toBe(0);
          
          // Verify the specific location ID is not present
          const foundLocation = data.locations.find(loc => loc.id === savedLocation.id);
          expect(foundLocation).toBeUndefined();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 30: View transition on last location deletion
   * Validates: Requirements 6.5
   * 
   * Property: For any deletion that results in 0 saved locations, 
   * the view state should transition to 'detail'
   */
  it('Property 30: View transition on last location deletion', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          coordinates: fc.record({
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true })
          }),
          query: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
        }),
        (userEmail, location) => {
          // Clear storage and DOM
          localStorage.clear();
          clearInMemoryStorage();
          document.body.innerHTML = '';
          
          // Set user context as named user
          setUserContext({ email: userEmail, isAnonymous: false });
          
          // Save a location first
          const saveResult = saveLocation(userEmail, location);
          expect(saveResult.success).toBe(true);
          
          // Get the saved location
          const locations = getLocations(userEmail);
          expect(locations.length).toBe(1);
          const savedLocation = locations[0];
          
          // Verify view should be detail (only 1 location)
          const viewBefore = determineView({ email: userEmail, isAnonymous: false }, 1);
          expect(viewBefore).toBe('detail');
          
          // Delete the location directly (without UI confirmation)
          const deleteResult = deleteLocation(userEmail, savedLocation.id);
          expect(deleteResult.success).toBe(true);
          
          // Verify location was deleted
          const locationsAfter = getLocations(userEmail);
          expect(locationsAfter.length).toBe(0);
          
          // Verify view determination logic returns 'detail' for 0 locations
          const viewAfterDeletion = determineView(
            { email: userEmail, isAnonymous: false }, 
            0
          );
          expect(viewAfterDeletion).toBe('detail');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
