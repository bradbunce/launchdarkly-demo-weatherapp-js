/**
 * Property-based tests for authentication-location integration
 * Feature: location-management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';
import {
  isNamedUser,
  isAnonymousUser,
  verifyAuthentication,
  handleLogin,
  handleLogout,
  shouldShowLocationManagementUI,
  hideLocationManagementUI,
  showLocationManagementUI,
  initializeAuthIntegration
} from '../src/authLocationIntegration.js';
import { saveLocation, getLocations } from '../src/locationStorage.js';
import { getViewState, setUserContext, resetViewState as resetViewStateImport, determineView } from '../src/viewStateManager.js';

describe('Authentication-Location Integration', () => {
  let dom;
  let document;
  let localStorage;

  beforeEach(() => {
    // Create a fresh DOM for each test
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="app-content"></div></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously'
    });
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    
    localStorage = {
      data: {},
      getItem(key) {
        return this.data[key] || null;
      },
      setItem(key, value) {
        this.data[key] = value;
      },
      removeItem(key) {
        delete this.data[key];
      },
      clear() {
        this.data = {};
      }
    };
    
    global.localStorage = localStorage;
    
    // Reset view state before each test
    resetViewStateImport();
  });

  /**
   * Feature: location-management, Property 43: No save controls for anonymous users
   * Validates: Requirements 9.1
   * 
   * Property: For any anonymous user context, no save location buttons or controls 
   * should be rendered in the UI
   */
  it('Property 43: No save controls for anonymous users', () => {
    fc.assert(
      fc.property(
        // Generate anonymous user contexts (with and without email)
        fc.oneof(
          fc.constant({ anonymous: true }),
          fc.constant({ anonymous: true, email: null }),
          fc.record({
            anonymous: fc.constant(true),
            email: fc.emailAddress()
          })
        ),
        (context) => {
          // Create mock LaunchDarkly client
          const mockLDClient = {
            variation: vi.fn(() => true) // save-locations flag enabled
          };
          
          // Verify: shouldShowLocationManagementUI returns false for anonymous users
          const shouldShow = shouldShowLocationManagementUI(context, mockLDClient);
          expect(shouldShow).toBe(false);
          
          // Verify: isAnonymousUser returns true
          expect(isAnonymousUser(context)).toBe(true);
          
          // Verify: isNamedUser returns false
          expect(isNamedUser(context)).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 44: No list view for anonymous users
   * Validates: Requirements 9.2
   * 
   * Property: For any anonymous user, the view state should always be 'detail', never 'list'
   */
  it('Property 44: No list view for anonymous users', () => {
    fc.assert(
      fc.property(
        // Generate anonymous user context
        fc.oneof(
          fc.constant({ anonymous: true }),
          fc.constant({ anonymous: true, email: null })
        ),
        // Generate any number of saved locations (even if they exist, shouldn't show list)
        fc.integer({ min: 0, max: 10 }),
        (context, locationCount) => {
          // Determine view for anonymous user
          const view = determineView(
            { email: context.email || null, isAnonymous: true },
            locationCount
          );
          
          // Verify: View is always 'detail' for anonymous users
          expect(view).toBe('detail');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 46: Authentication check before location operations
   * Validates: Requirements 9.4
   * 
   * Property: For any location management operation (save, update, delete), 
   * the user's anonymous status should be checked and the operation should be 
   * rejected if the user is anonymous
   */
  it('Property 46: Authentication check before location operations', () => {
    fc.assert(
      fc.property(
        // Generate anonymous user context
        fc.oneof(
          fc.constant({ anonymous: true }),
          fc.constant({ anonymous: true, email: null }),
          fc.constant(null),
          fc.constant(undefined)
        ),
        // Generate location data
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          coordinates: fc.record({
            latitude: fc.double({ min: -90, max: 90 }),
            longitude: fc.double({ min: -180, max: 180 })
          }),
          query: fc.string({ minLength: 1, maxLength: 50 })
        }),
        (context, location) => {
          // Clear localStorage
          localStorage.clear();
          
          // Verify: verifyAuthentication returns false for anonymous users
          const isAuthenticated = verifyAuthentication(context, 'save location');
          expect(isAuthenticated).toBe(false);
          
          // Verify: isAnonymousUser returns true
          expect(isAnonymousUser(context)).toBe(true);
          
          // Attempt to save location (should fail or be blocked)
          // In a real implementation, this would be blocked by the UI layer
          // Here we verify the authentication check itself
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 43: Save controls visible for named users
   * Validates: Requirements 9.1 (inverse case)
   * 
   * Property: For any named user context with save-locations flag enabled, 
   * save location controls should be available
   */
  it('Property 43: Save controls visible for named users', () => {
    fc.assert(
      fc.property(
        // Generate named user context
        fc.record({
          anonymous: fc.constant(false),
          email: fc.emailAddress()
        }),
        (context) => {
          // Create mock LaunchDarkly client with flag enabled
          const mockLDClient = {
            variation: vi.fn(() => true) // save-locations flag enabled
          };
          
          // Verify: shouldShowLocationManagementUI returns true for named users
          const shouldShow = shouldShowLocationManagementUI(context, mockLDClient);
          expect(shouldShow).toBe(true);
          
          // Verify: isNamedUser returns true
          expect(isNamedUser(context)).toBe(true);
          
          // Verify: isAnonymousUser returns false
          expect(isAnonymousUser(context)).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 43: Save controls hidden when flag disabled
   * Validates: Requirements 9.1
   * 
   * Property: For any user context when save-locations flag is disabled, 
   * no save location controls should be shown
   */
  it('Property 43: Save controls hidden when flag disabled', () => {
    fc.assert(
      fc.property(
        // Generate any user context (named or anonymous)
        fc.oneof(
          fc.record({
            anonymous: fc.constant(false),
            email: fc.emailAddress()
          }),
          fc.constant({ anonymous: true })
        ),
        (context) => {
          // Create mock LaunchDarkly client with flag disabled
          const mockLDClient = {
            variation: vi.fn(() => false) // save-locations flag disabled
          };
          
          // Verify: shouldShowLocationManagementUI returns false when flag is disabled
          const shouldShow = shouldShowLocationManagementUI(context, mockLDClient);
          expect(shouldShow).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 46: Authentication check for named users
   * Validates: Requirements 9.4 (inverse case)
   * 
   * Property: For any named user, authentication check should pass
   */
  it('Property 46: Authentication check passes for named users', () => {
    fc.assert(
      fc.property(
        // Generate named user context
        fc.record({
          anonymous: fc.constant(false),
          email: fc.emailAddress()
        }),
        (context) => {
          // Verify: verifyAuthentication returns true for named users
          const isAuthenticated = verifyAuthentication(context, 'save location');
          expect(isAuthenticated).toBe(true);
          
          // Verify: isNamedUser returns true
          expect(isNamedUser(context)).toBe(true);
          
          // Verify: isAnonymousUser returns false
          expect(isAnonymousUser(context)).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 34: Logout preserves locations
   * Validates: Requirements 7.4
   * 
   * Property: For any logout operation, the locations in localStorage should remain unchanged
   */
  it('Property 34: Logout preserves locations', () => {
    fc.assert(
      fc.property(
        // Generate user email
        fc.emailAddress(),
        // Generate array of locations with valid names (non-whitespace)
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            coordinates: fc.record({
              latitude: fc.double({ min: -90, max: 90 }),
              longitude: fc.double({ min: -180, max: 180 })
            }),
            query: fc.string({ minLength: 1, maxLength: 50 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (userEmail, locations) => {
          // Clear localStorage
          localStorage.clear();
          
          // Save locations for the user (only valid ones will be saved)
          const savedCount = locations.filter(location => {
            const result = saveLocation(userEmail, location);
            return result.success;
          }).length;
          
          // Verify locations are saved
          const savedLocations = getLocations(userEmail);
          expect(savedLocations.length).toBe(savedCount);
          
          // Perform logout
          const logoutResult = handleLogout();
          
          // Verify logout was successful
          expect(logoutResult.success).toBe(true);
          
          // Verify locations are still in localStorage (preserved)
          const locationsAfterLogout = getLocations(userEmail);
          expect(locationsAfterLogout.length).toBe(savedCount);
          
          // Verify each successfully saved location is still present
          locations.forEach(location => {
            // Check if this location was successfully saved
            const wasSaved = savedLocations.some(loc => 
              loc.name === location.name &&
              loc.coordinates.latitude === location.coordinates.latitude &&
              loc.coordinates.longitude === location.coordinates.longitude
            );
            
            if (wasSaved) {
              // Verify it's still there after logout
              const found = locationsAfterLogout.some(loc => 
                loc.name === location.name &&
                loc.coordinates.latitude === location.coordinates.latitude &&
                loc.coordinates.longitude === location.coordinates.longitude
              );
              expect(found).toBe(true);
            }
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 47: Logout hides location management UI
   * Validates: Requirements 9.5
   * 
   * Property: For any transition from named user to anonymous user, 
   * all location management UI elements should be removed from the display
   */
  it('Property 47: Logout hides location management UI', () => {
    fc.assert(
      fc.property(
        // Generate user context
        fc.record({
          anonymous: fc.constant(false),
          email: fc.emailAddress()
        }),
        (context) => {
          // Setup: Create UI elements that should be hidden on logout
          const appContent = document.getElementById('app-content');
          appContent.innerHTML = `
            <button id="save-location-btn">Save Location</button>
            <div class="location-list">
              <div class="location-card">
                <button class="edit-button">Edit</button>
                <button class="delete-button">Delete</button>
              </div>
            </div>
            <button id="back-to-list-btn">Back to List</button>
          `;
          
          // Verify UI elements are visible before logout
          expect(document.getElementById('save-location-btn')).not.toBeNull();
          expect(document.querySelector('.location-list')).not.toBeNull();
          expect(document.querySelector('.edit-button')).not.toBeNull();
          expect(document.querySelector('.delete-button')).not.toBeNull();
          expect(document.getElementById('back-to-list-btn')).not.toBeNull();
          
          // Perform logout
          handleLogout(() => {
            // Callback to hide UI
            hideLocationManagementUI();
          });
          
          // Verify UI elements are hidden after logout
          const saveBtn = document.getElementById('save-location-btn');
          const locationList = document.querySelector('.location-list');
          const editBtn = document.querySelector('.edit-button');
          const deleteBtn = document.querySelector('.delete-button');
          const backBtn = document.getElementById('back-to-list-btn');
          
          // Check that elements are hidden (display: none)
          if (saveBtn) expect(saveBtn.style.display).toBe('none');
          if (locationList) expect(locationList.style.display).toBe('none');
          if (editBtn) expect(editBtn.style.display).toBe('none');
          if (deleteBtn) expect(deleteBtn.style.display).toBe('none');
          if (backBtn) expect(backBtn.style.display).toBe('none');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 47: Logout resets view state
   * Validates: Requirements 9.5
   * 
   * Property: For any logout operation, the view state should be reset to anonymous defaults
   */
  it('Property 47: Logout resets view state to anonymous', () => {
    fc.assert(
      fc.property(
        // Generate user context
        fc.record({
          anonymous: fc.constant(false),
          email: fc.emailAddress()
        }),
        (context) => {
          // Setup: Set user context as named user
          setUserContext({
            email: context.email,
            isAnonymous: false
          });
          
          // Verify user is set as named
          let viewState = getViewState();
          expect(viewState.user.email).toBe(context.email);
          expect(viewState.user.isAnonymous).toBe(false);
          
          // Perform logout
          handleLogout();
          
          // Verify view state is reset to anonymous
          viewState = getViewState();
          expect(viewState.user.email).toBeNull();
          expect(viewState.user.isAnonymous).toBe(true);
          expect(viewState.currentView).toBe('detail');
          expect(viewState.selectedLocationId).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 35: Login loads locations
   * Validates: Requirements 7.5
   * 
   * Property: For any named user login, their saved locations should be loaded from localStorage 
   * and the appropriate view (list or detail) should be displayed
   */
  it('Property 35: Login loads locations', () => {
    fc.assert(
      fc.property(
        // Generate user context
        fc.record({
          anonymous: fc.constant(false),
          email: fc.emailAddress()
        }),
        // Generate array of locations
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            coordinates: fc.record({
              latitude: fc.double({ min: -90, max: 90 }),
              longitude: fc.double({ min: -180, max: 180 })
            }),
            query: fc.string({ minLength: 1, maxLength: 50 })
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (context, locations) => {
          // Clear localStorage
          localStorage.clear();
          
          // Pre-save locations for the user (simulating previous session)
          locations.forEach(location => {
            saveLocation(context.email, location);
          });
          
          // Get count of successfully saved locations
          const savedLocations = getLocations(context.email);
          const savedCount = savedLocations.length;
          
          // Create mock LaunchDarkly client
          const mockLDClient = {
            variation: vi.fn(() => true) // save-locations flag enabled
          };
          
          // Perform login
          const loginResult = handleLogin(context, mockLDClient);
          
          // Verify login was successful
          expect(loginResult.success).toBe(true);
          
          // Verify locations were loaded
          expect(loginResult.locations).toBeDefined();
          expect(loginResult.locations.length).toBe(savedCount);
          
          // Verify appropriate view was determined
          expect(loginResult.view).toBeDefined();
          if (savedCount >= 2) {
            expect(loginResult.view).toBe('list');
          } else {
            expect(loginResult.view).toBe('detail');
          }
          
          // Verify each location was loaded correctly
          savedLocations.forEach(savedLoc => {
            const found = loginResult.locations.some(loc => 
              loc.id === savedLoc.id &&
              loc.name === savedLoc.name &&
              loc.coordinates.latitude === savedLoc.coordinates.latitude &&
              loc.coordinates.longitude === savedLoc.coordinates.longitude
            );
            expect(found).toBe(true);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 35: Login sets user context
   * Validates: Requirements 7.5
   * 
   * Property: For any named user login, the user context should be set correctly
   */
  it('Property 35: Login sets user context', () => {
    fc.assert(
      fc.property(
        // Generate user context
        fc.record({
          anonymous: fc.constant(false),
          email: fc.emailAddress()
        }),
        (context) => {
          // Clear localStorage
          localStorage.clear();
          
          // Create mock LaunchDarkly client
          const mockLDClient = {
            variation: vi.fn(() => true) // save-locations flag enabled
          };
          
          // Perform login
          handleLogin(context, mockLDClient);
          
          // Verify user context was set
          const viewState = getViewState();
          expect(viewState.user.email).toBe(context.email);
          expect(viewState.user.isAnonymous).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 35: Login with no locations shows detail view
   * Validates: Requirements 7.5
   * 
   * Property: For any named user login with no saved locations, detail view should be shown
   */
  it('Property 35: Login with no locations shows detail view', () => {
    fc.assert(
      fc.property(
        // Generate user context
        fc.record({
          anonymous: fc.constant(false),
          email: fc.emailAddress()
        }),
        (context) => {
          // Clear localStorage (no saved locations)
          localStorage.clear();
          
          // Create mock LaunchDarkly client
          const mockLDClient = {
            variation: vi.fn(() => true) // save-locations flag enabled
          };
          
          // Perform login
          const loginResult = handleLogin(context, mockLDClient);
          
          // Verify login was successful
          expect(loginResult.success).toBe(true);
          
          // Verify no locations were loaded
          expect(loginResult.locations.length).toBe(0);
          
          // Verify detail view is shown
          expect(loginResult.view).toBe('detail');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
