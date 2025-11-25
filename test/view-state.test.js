/**
 * Property-based tests for view state manager module
 * Feature: location-management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  determineView,
  shouldShowBackButton,
  transitionToListView,
  transitionToDetailView,
  handleBackNavigation,
  handleCardClick,
  getViewState,
  setUserContext,
  resetViewState
} from '../src/viewStateManager.js';

describe('View State Manager', () => {
  beforeEach(() => {
    resetViewState();
    window.location.hash = '';
  });

  /**
   * Feature: location-management, Property 6: List view for multiple locations
   * Validates: Requirements 2.1
   * 
   * Property: For any named user with 2 or more saved locations, the view state should be 'list'
   */
  it('Property 6: List view for multiple locations', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.integer({ min: 2, max: 100 }),
        (userEmail, locationCount) => {
          const user = {
            email: userEmail,
            isAnonymous: false
          };
          
          // Mock ldClient with save-locations flag enabled
          const mockLDClient = {
            variation: vi.fn((flagKey, defaultValue) => {
              if (flagKey === 'save-locations') {
                return true; // Flag enabled
              }
              return defaultValue;
            })
          };
          
          const view = determineView(user, locationCount, mockLDClient);
          
          expect(view).toBe('list');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 8: Detail view for single location
   * Validates: Requirements 2.3
   * 
   * Property: For any named user with exactly 1 saved location, the view state should be 'detail'
   */
  it('Property 8: Detail view for single location', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (userEmail) => {
          const user = {
            email: userEmail,
            isAnonymous: false
          };
          
          const view = determineView(user, 1);
          
          expect(view).toBe('detail');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 9: Detail view for zero locations
   * Validates: Requirements 2.4
   * 
   * Property: For any named user with 0 saved locations, the view state should be 'detail'
   */
  it('Property 9: Detail view for zero locations', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (userEmail) => {
          const user = {
            email: userEmail,
            isAnonymous: false
          };
          
          const view = determineView(user, 0);
          
          expect(view).toBe('detail');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

  /**
   * Feature: location-management, Property 11: View transition on card click
   * Validates: Requirements 3.1
   * 
   * Property: For any location card click event, the view state should transition from 'list' 
   * to 'detail' and the selectedLocationId should be set to the clicked location's ID
   */
  it('Property 11: View transition on card click', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (locationId) => {
          // Reset to list view
          resetViewState();
          transitionToListView();
          
          // Verify we're in list view
          let state = getViewState();
          expect(state.currentView).toBe('list');
          expect(state.selectedLocationId).toBeNull();
          
          // Simulate card click
          handleCardClick(locationId);
          
          // Verify transition to detail view
          state = getViewState();
          expect(state.currentView).toBe('detail');
          expect(state.selectedLocationId).toBe(locationId);
          
          // Verify URL was updated
          expect(window.location.hash).toBe(`#location/${locationId}`);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 17: View transition on back button click
   * Validates: Requirements 4.2
   * 
   * Property: For any back button click, the view state should transition from 'detail' to 'list'
   */
  it('Property 17: View transition on back button click', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (locationId) => {
          // Reset and transition to detail view
          resetViewState();
          transitionToDetailView(locationId);
          
          // Verify we're in detail view
          let state = getViewState();
          expect(state.currentView).toBe('detail');
          expect(state.selectedLocationId).toBe(locationId);
          
          // Simulate back button click
          handleBackNavigation();
          
          // Verify transition to list view
          state = getViewState();
          expect(state.currentView).toBe('list');
          expect(state.selectedLocationId).toBeNull();
          
          // Verify URL was updated
          expect(window.location.hash).toBe('#locations');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 16: Back button visibility with multiple locations
   * Validates: Requirements 4.1
   * 
   * Property: For any user in detail view with 2 or more saved locations, 
   * a back button should be present in the UI
   */
  it('Property 16: Back button visibility with multiple locations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100 }),
        (locationCount) => {
          // Reset to detail view
          resetViewState();
          transitionToDetailView('test-location-id');
          
          // Check if back button should be visible
          const shouldShow = shouldShowBackButton('detail', locationCount);
          
          expect(shouldShow).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 19: Back button hidden for single location
   * Validates: Requirements 4.4
   * 
   * Property: For any user with exactly 1 saved location in detail view, 
   * no back button should be present in the UI
   */
  it('Property 19: Back button hidden for single location', () => {
    fc.assert(
      fc.property(
        fc.constant(1),
        (locationCount) => {
          // Reset to detail view
          resetViewState();
          transitionToDetailView('test-location-id');
          
          // Check if back button should be visible
          const shouldShow = shouldShowBackButton('detail', locationCount);
          
          expect(shouldShow).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Back button hidden in list view
   * Even with multiple locations, back button should not show in list view
   */
  it('Back button hidden in list view', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100 }),
        (locationCount) => {
          // Reset to list view
          resetViewState();
          transitionToListView();
          
          // Check if back button should be visible
          const shouldShow = shouldShowBackButton('list', locationCount);
          
          expect(shouldShow).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
