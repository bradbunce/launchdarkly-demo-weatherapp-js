/**
 * Property-based tests for location storage module
 * Feature: location-management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  saveLocation,
  getLocations,
  updateLocation,
  deleteLocation,
  locationExists,
  validateLocation,
  loadLocations,
  clearInMemoryStorage
} from '../src/locationStorage.js';

describe('Location Storage', () => {
  beforeEach(() => {
    localStorage.clear();
    clearInMemoryStorage();
  });

  /**
   * Feature: location-management, Property 2: Location persistence to user-specific storage
   * Validates: Requirements 1.2
   * 
   * Property: For any valid location and named user email, saving the location should result 
   * in the location being stored in localStorage under the key `weatherAppLocations_{email}`
   */
  it('Property 2: Location persistence to user-specific storage', () => {
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
          // Clear storage for this user before test
          const key = `weatherAppLocations_${userEmail}`;
          localStorage.removeItem(key);
          clearInMemoryStorage();
          
          // Save the location
          const result = saveLocation(userEmail, location);
          
          // Verify save was successful
          expect(result.success).toBe(true);
          
          // Verify location is stored under user-specific key
          const stored = localStorage.getItem(key);
          expect(stored).not.toBeNull();
          
          // Verify stored data structure
          const data = JSON.parse(stored);
          expect(data.locations).toBeDefined();
          expect(Array.isArray(data.locations)).toBe(true);
          expect(data.version).toBe(1);
          
          // Verify location is in the stored array
          const savedLocation = data.locations.find(loc => loc.name === location.name);
          expect(savedLocation).toBeDefined();
          // Use toBeCloseTo for floating point comparison (handles -0 vs +0)
          expect(savedLocation.coordinates.latitude).toBeCloseTo(location.coordinates.latitude, 10);
          expect(savedLocation.coordinates.longitude).toBeCloseTo(location.coordinates.longitude, 10);
          expect(savedLocation.query).toBe(location.query);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 3: Duplicate location rejection
   * Validates: Requirements 1.3
   * 
   * Property: For any location that already exists in a user's saved locations list, 
   * attempting to save it again should be rejected and return an error message
   */
  it('Property 3: Duplicate location rejection', () => {
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
          // Clear storage for this user before test
          const key = `weatherAppLocations_${userEmail}`;
          localStorage.removeItem(key);
          clearInMemoryStorage();
          
          // Save the location first time
          const firstResult = saveLocation(userEmail, location);
          expect(firstResult.success).toBe(true);
          
          // Try to save the same location again (exact match)
          const duplicateResult = saveLocation(userEmail, location);
          expect(duplicateResult.success).toBe(false);
          expect(duplicateResult.error).toBeDefined();
          expect(duplicateResult.error).toContain('already');
          
          // Try to save with different case (should also be rejected)
          const differentCaseLocation = {
            ...location,
            name: location.name.toUpperCase()
          };
          const caseResult = saveLocation(userEmail, differentCaseLocation);
          expect(caseResult.success).toBe(false);
          expect(caseResult.error).toBeDefined();
          
          // Try to save with extra whitespace (should also be rejected)
          const whitespaceLocation = {
            ...location,
            name: `  ${location.name}  `
          };
          const whitespaceResult = saveLocation(userEmail, whitespaceLocation);
          expect(whitespaceResult.success).toBe(false);
          expect(whitespaceResult.error).toBeDefined();
          
          // Verify only one location was saved
          const locations = getLocations(userEmail);
          expect(locations.length).toBe(1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 5: Location data completeness
   * Validates: Requirements 1.5
   * 
   * Property: For any saved location, retrieving it from storage should return an object 
   * containing name, coordinates (latitude and longitude), and addedAt timestamp
   */
  it('Property 5: Location data completeness', () => {
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
          // Clear storage for this user before test
          const key = `weatherAppLocations_${userEmail}`;
          localStorage.removeItem(key);
          clearInMemoryStorage();
          
          // Save the location
          const result = saveLocation(userEmail, location);
          expect(result.success).toBe(true);
          
          // Retrieve locations
          const locations = getLocations(userEmail);
          expect(locations.length).toBe(1);
          
          const savedLocation = locations[0];
          
          // Verify all required fields are present
          expect(savedLocation.name).toBeDefined();
          expect(typeof savedLocation.name).toBe('string');
          expect(savedLocation.name.trim().length).toBeGreaterThan(0);
          
          expect(savedLocation.coordinates).toBeDefined();
          expect(typeof savedLocation.coordinates).toBe('object');
          expect(typeof savedLocation.coordinates.latitude).toBe('number');
          expect(typeof savedLocation.coordinates.longitude).toBe('number');
          expect(savedLocation.coordinates.latitude).toBeGreaterThanOrEqual(-90);
          expect(savedLocation.coordinates.latitude).toBeLessThanOrEqual(90);
          expect(savedLocation.coordinates.longitude).toBeGreaterThanOrEqual(-180);
          expect(savedLocation.coordinates.longitude).toBeLessThanOrEqual(180);
          
          expect(savedLocation.addedAt).toBeDefined();
          expect(typeof savedLocation.addedAt).toBe('string');
          // Verify it's a valid ISO 8601 timestamp
          expect(new Date(savedLocation.addedAt).toISOString()).toBe(savedLocation.addedAt);
          
          // Verify query is also present (part of data model)
          expect(savedLocation.query).toBeDefined();
          expect(typeof savedLocation.query).toBe('string');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 33: localStorage fallback
   * Validates: Requirements 7.3
   * 
   * Property: For any localStorage error, the app should continue functioning 
   * with in-memory storage without throwing errors
   */
  it('Property 33: localStorage fallback', () => {
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
          // Clear storage before test
          localStorage.clear();
          clearInMemoryStorage();
          
          // Mock localStorage to throw an error
          const originalSetItem = localStorage.setItem;
          const originalGetItem = localStorage.getItem;
          
          localStorage.setItem = () => {
            throw new Error('QuotaExceededError');
          };
          
          localStorage.getItem = () => {
            throw new Error('localStorage unavailable');
          };
          
          // Save location should not throw, should use in-memory fallback
          let result;
          expect(() => {
            result = saveLocation(userEmail, location);
          }).not.toThrow();
          
          // Should still succeed
          expect(result.success).toBe(true);
          
          // Should be able to retrieve from in-memory storage
          let locations;
          expect(() => {
            locations = getLocations(userEmail);
          }).not.toThrow();
          
          expect(locations.length).toBe(1);
          expect(locations[0].name).toBe(location.name);
          
          // Restore localStorage
          localStorage.setItem = originalSetItem;
          localStorage.getItem = originalGetItem;
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
