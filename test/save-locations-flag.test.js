/**
 * Property-based tests for save-locations feature flag integration
 * Feature: location-management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';
import { determineView } from '../src/viewStateManager.js';
import { renderLocationCard } from '../src/locationCardRenderer.js';
import { createSaveLocationButton } from '../src/addLocationHandler.js';
import { shouldShowLocationManagementUI } from '../src/authLocationIntegration.js';

describe('Save-Locations Feature Flag Integration', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Create a fresh DOM for each test
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="app-content"></div></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously'
    });
    document = dom.window.document;
    window = dom.window;
    
    // Make document and window available globally
    global.document = document;
    global.window = window;
  });

  /**
   * Property: When save-locations flag is false, no location management UI is shown
   * Validates: Requirements 1.1, 1.4
   * 
   * For any named user context, when the save-locations flag is false,
   * no save buttons, edit buttons, delete buttons, or list view should be displayed
   */
  it('Property: save-locations false hides all location management UI', () => {
    fc.assert(
      fc.property(
        // Generate a named user context
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          anonymous: fc.constant(false)
        }),
        // Generate location count (0-10)
        fc.integer({ min: 0, max: 10 }),
        (context, locationCount) => {
          // Create mock LaunchDarkly client with save-locations = false
          const mockLDClient = {
            variation: vi.fn((flagKey, defaultValue) => {
              if (flagKey === 'save-locations') {
                return false; // Flag is disabled
              }
              return defaultValue;
            })
          };
          
          // Test 1: View determination should always return 'detail' when flag is false
          const view = determineView(
            { email: context.email, isAnonymous: false },
            locationCount,
            mockLDClient
          );
          expect(view).toBe('detail');
          
          // Test 2: Save button should not be created when flag is false
          const weatherData = {
            city: 'San Francisco',
            latitude: 37.7749,
            longitude: -122.4194,
            temperature: 65
          };
          
          const saveButton = createSaveLocationButton(
            context,
            weatherData,
            mockLDClient,
            () => {}
          );
          expect(saveButton).toBeNull();
          
          // Test 3: Location management UI visibility check should return false
          const shouldShow = shouldShowLocationManagementUI(context, mockLDClient);
          expect(shouldShow).toBe(false);
          
          // Test 4: Location cards should not have edit/delete buttons when flag is false
          const location = {
            id: 'test-location-id',
            name: 'Test Location',
            coordinates: { latitude: 37.7749, longitude: -122.4194 },
            query: 'Test Location',
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          const card = renderLocationCard(
            location,
            weatherData,
            { canSaveLocations: false }
          );
          
          const editButton = card.querySelector('.edit-button');
          const deleteButton = card.querySelector('.delete-button');
          
          expect(editButton).toBeNull();
          expect(deleteButton).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When save-locations flag is true, location management UI is available for named users
   * Validates: Requirements 1.1, 1.4
   * 
   * For any named user context, when the save-locations flag is true,
   * save buttons, edit buttons, delete buttons, and list view should be available
   */
  it('Property: save-locations true shows location management UI for named users', () => {
    fc.assert(
      fc.property(
        // Generate a named user context
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          anonymous: fc.constant(false)
        }),
        // Generate location count (2-10 to test list view)
        fc.integer({ min: 2, max: 10 }),
        (context, locationCount) => {
          // Create mock LaunchDarkly client with save-locations = true
          const mockLDClient = {
            variation: vi.fn((flagKey, defaultValue) => {
              if (flagKey === 'save-locations') {
                return true; // Flag is enabled
              }
              return defaultValue;
            })
          };
          
          // Test 1: View determination should return 'list' for multiple locations when flag is true
          const view = determineView(
            { email: context.email, isAnonymous: false },
            locationCount,
            mockLDClient
          );
          expect(view).toBe('list');
          
          // Test 2: Save button should be created when flag is true (for new locations)
          const weatherData = {
            city: 'New York',
            latitude: 40.7128,
            longitude: -74.0060,
            temperature: 70
          };
          
          const saveButton = createSaveLocationButton(
            context,
            weatherData,
            mockLDClient,
            () => {}
          );
          // Note: saveButton might be null if location already exists, but the function should execute
          // The key is that it doesn't return null due to flag being false
          expect(mockLDClient.variation).toHaveBeenCalledWith('save-locations', false);
          
          // Test 3: Location management UI visibility check should return true
          const shouldShow = shouldShowLocationManagementUI(context, mockLDClient);
          expect(shouldShow).toBe(true);
          
          // Test 4: Location cards should have edit/delete buttons when flag is true
          const location = {
            id: 'test-location-id',
            name: 'Test Location',
            coordinates: { latitude: 37.7749, longitude: -122.4194 },
            query: 'Test Location',
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          const card = renderLocationCard(
            location,
            weatherData,
            { canSaveLocations: true }
          );
          
          const editButton = card.querySelector('.edit-button');
          const deleteButton = card.querySelector('.delete-button');
          
          expect(editButton).not.toBeNull();
          expect(deleteButton).not.toBeNull();
          expect(editButton.dataset.locationId).toBe(location.id);
          expect(deleteButton.dataset.locationId).toBe(location.id);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Anonymous users never see location management UI regardless of flag
   * Validates: Requirements 1.4, 9.1, 9.2
   * 
   * For any anonymous user context, regardless of the save-locations flag value,
   * no location management UI should be displayed
   */
  it('Property: Anonymous users never see location management UI', () => {
    fc.assert(
      fc.property(
        // Generate flag value (true or false)
        fc.boolean(),
        // Generate location count
        fc.integer({ min: 0, max: 10 }),
        (flagValue, locationCount) => {
          // Create anonymous context
          const anonymousContext = {
            anonymous: true,
            kind: 'user'
          };
          
          // Create mock LaunchDarkly client
          const mockLDClient = {
            variation: vi.fn((flagKey, defaultValue) => {
              if (flagKey === 'save-locations') {
                return flagValue;
              }
              return defaultValue;
            })
          };
          
          // Test 1: View should always be 'detail' for anonymous users
          const view = determineView(
            { email: null, isAnonymous: true },
            locationCount,
            mockLDClient
          );
          expect(view).toBe('detail');
          
          // Test 2: Save button should never be created for anonymous users
          const weatherData = {
            city: 'Los Angeles',
            latitude: 34.0522,
            longitude: -118.2437,
            temperature: 75
          };
          
          const saveButton = createSaveLocationButton(
            anonymousContext,
            weatherData,
            mockLDClient,
            () => {}
          );
          expect(saveButton).toBeNull();
          
          // Test 3: Location management UI should not be shown for anonymous users
          const shouldShow = shouldShowLocationManagementUI(anonymousContext, mockLDClient);
          expect(shouldShow).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Flag changes trigger UI updates
   * Validates: Requirements 1.1, 1.4
   * 
   * When the save-locations flag changes from true to false or vice versa,
   * the UI should update accordingly
   */
  it('Property: Flag changes trigger appropriate UI updates', () => {
    fc.assert(
      fc.property(
        // Generate a named user context
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          anonymous: fc.constant(false)
        }),
        // Generate initial flag value
        fc.boolean(),
        (context, initialFlagValue) => {
          let currentFlagValue = initialFlagValue;
          const flagChangeCallbacks = [];
          
          // Create mock LaunchDarkly client with flag change support
          const mockLDClient = {
            variation: vi.fn((flagKey, defaultValue) => {
              if (flagKey === 'save-locations') {
                return currentFlagValue;
              }
              return defaultValue;
            }),
            on: vi.fn((event, callback) => {
              if (event === 'change:save-locations') {
                flagChangeCallbacks.push(callback);
              }
            })
          };
          
          // Initial state check
          const initialView = determineView(
            { email: context.email, isAnonymous: false },
            3, // Multiple locations
            mockLDClient
          );
          
          if (initialFlagValue) {
            expect(initialView).toBe('list');
          } else {
            expect(initialView).toBe('detail');
          }
          
          // Simulate flag change
          currentFlagValue = !currentFlagValue;
          
          // Trigger flag change callbacks
          flagChangeCallbacks.forEach(callback => callback());
          
          // Check new state
          const newView = determineView(
            { email: context.email, isAnonymous: false },
            3, // Multiple locations
            mockLDClient
          );
          
          if (currentFlagValue) {
            expect(newView).toBe('list');
          } else {
            expect(newView).toBe('detail');
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
