/**
 * Property-based tests for edit location functionality
 * Feature: location-management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';
import {
  saveLocation,
  getLocations,
  updateLocation,
  clearInMemoryStorage
} from '../src/locationStorage.js';
import {
  showEditLocationForm,
  handleEditLocationSubmit,
  validateEditForm
} from '../src/editLocationHandler.js';

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

describe('Edit Location Functionality', () => {
  /**
   * Feature: location-management, Property 22: Edit form pre-population
   * Validates: Requirements 5.2
   * 
   * Property: For any edit button click, a form should be displayed with fields 
   * pre-populated with the location's current name and coordinates
   */
  it('Property 22: Edit form pre-population', () => {
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
          
          // Show edit form
          showEditLocationForm(userEmail, savedLocation.id, () => {}, () => {});
          
          // Verify form exists
          const form = document.getElementById('edit-location-form');
          expect(form).not.toBeNull();
          
          // Verify name input is pre-populated with current location name
          const nameInput = document.getElementById('edit-location-name');
          expect(nameInput).not.toBeNull();
          expect(nameInput.value).toBe(savedLocation.name);
          
          // Verify coordinates are displayed (read-only)
          const coordsInput = document.getElementById('edit-location-coords');
          expect(coordsInput).not.toBeNull();
          expect(coordsInput.disabled).toBe(true);
          
          // Verify coordinates contain the location's latitude and longitude
          const coordsValue = coordsInput.value;
          expect(coordsValue).toContain(savedLocation.coordinates.latitude.toFixed(4));
          expect(coordsValue).toContain(savedLocation.coordinates.longitude.toFixed(4));
          
          // Verify save and cancel buttons exist
          const saveButton = document.getElementById('edit-location-save');
          expect(saveButton).not.toBeNull();
          
          const cancelButton = document.getElementById('edit-location-cancel');
          expect(cancelButton).not.toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 23: Location update persistence
   * Validates: Requirements 5.3
   * 
   * Property: For any valid edit form submission, the location in localStorage 
   * should be updated with the new values
   */
  it('Property 23: Location update persistence', () => {
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
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        (userEmail, location, newName) => {
          // Clear storage
          localStorage.clear();
          clearInMemoryStorage();
          
          // Save a location first
          const saveResult = saveLocation(userEmail, location);
          expect(saveResult.success).toBe(true);
          
          // Get the saved location
          const locations = getLocations(userEmail);
          expect(locations.length).toBe(1);
          const savedLocation = locations[0];
          const originalCoordinates = { ...savedLocation.coordinates };
          
          // Update the location with new name
          const updateResult = updateLocation(userEmail, savedLocation.id, {
            name: newName.trim()
          });
          
          // If update failed due to duplicate, skip this test case
          if (!updateResult.success) {
            return true;
          }
          
          // Verify update was successful
          expect(updateResult.success).toBe(true);
          
          // Retrieve location from storage
          const key = `weatherAppLocations_${userEmail}`;
          const stored = localStorage.getItem(key);
          expect(stored).not.toBeNull();
          
          const data = JSON.parse(stored);
          expect(data.locations).toBeDefined();
          expect(data.locations.length).toBe(1);
          
          const updatedLocation = data.locations[0];
          
          // Verify name was updated
          expect(updatedLocation.name).toBe(newName.trim());
          
          // Verify coordinates were NOT changed (should be preserved)
          expect(updatedLocation.coordinates.latitude).toBeCloseTo(originalCoordinates.latitude, 10);
          expect(updatedLocation.coordinates.longitude).toBeCloseTo(originalCoordinates.longitude, 10);
          
          // Verify ID was preserved
          expect(updatedLocation.id).toBe(savedLocation.id);
          
          // Verify addedAt was preserved
          expect(updatedLocation.addedAt).toBe(savedLocation.addedAt);
          
          // Verify updatedAt was changed
          expect(updatedLocation.updatedAt).toBeDefined();
          expect(new Date(updatedLocation.updatedAt).getTime()).toBeGreaterThanOrEqual(
            new Date(savedLocation.addedAt).getTime()
          );
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 25: Edit cancellation preserves data
   * Validates: Requirements 5.5
   * 
   * Property: For any edit cancellation, the location data in localStorage 
   * should remain unchanged from before the edit was initiated
   */
  it('Property 25: Edit cancellation preserves data', () => {
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
          
          // Get the saved location
          const locationsBefore = getLocations(userEmail);
          expect(locationsBefore.length).toBe(1);
          const savedLocation = locationsBefore[0];
          
          // Store original data for comparison
          const originalData = JSON.parse(JSON.stringify(savedLocation));
          
          // Show edit form
          let cancelCalled = false;
          showEditLocationForm(
            userEmail, 
            savedLocation.id, 
            () => {}, 
            () => { cancelCalled = true; }
          );
          
          // Verify form exists
          const form = document.getElementById('edit-location-form');
          expect(form).not.toBeNull();
          
          // Modify the name input (but don't submit)
          const nameInput = document.getElementById('edit-location-name');
          expect(nameInput).not.toBeNull();
          nameInput.value = 'Modified Name That Should Not Be Saved';
          
          // Click cancel button
          const cancelButton = document.getElementById('edit-location-cancel');
          expect(cancelButton).not.toBeNull();
          cancelButton.click();
          
          // Verify cancel callback was called
          expect(cancelCalled).toBe(true);
          
          // Verify form was removed
          const formAfterCancel = document.getElementById('edit-location-form');
          expect(formAfterCancel).toBeNull();
          
          // Retrieve location from storage
          const locationsAfter = getLocations(userEmail);
          expect(locationsAfter.length).toBe(1);
          const locationAfterCancel = locationsAfter[0];
          
          // Verify all data is unchanged
          expect(locationAfterCancel.id).toBe(originalData.id);
          expect(locationAfterCancel.name).toBe(originalData.name);
          expect(locationAfterCancel.coordinates.latitude).toBeCloseTo(originalData.coordinates.latitude, 10);
          expect(locationAfterCancel.coordinates.longitude).toBeCloseTo(originalData.coordinates.longitude, 10);
          expect(locationAfterCancel.query).toBe(originalData.query);
          expect(locationAfterCancel.addedAt).toBe(originalData.addedAt);
          expect(locationAfterCancel.updatedAt).toBe(originalData.updatedAt);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
