/**
 * Property-based tests for logging functionality
 * Feature: location-management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  saveLocation,
  updateLocation,
  deleteLocation,
  loadLocations,
  clearInMemoryStorage
} from '../src/locationStorage.js';

describe('Logging Properties', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    localStorage.clear();
    clearInMemoryStorage();
    
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  /**
   * Feature: location-management, Property 48: Save operation logging
   * Validates: Requirements 10.1
   * 
   * Property: For any location save operation, a console log should be produced 
   * containing the location data and user email
   */
  it('Property 48: Save operation logging', () => {
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
          // Clear storage and reset spies
          const key = `weatherAppLocations_${userEmail}`;
          localStorage.removeItem(key);
          clearInMemoryStorage();
          consoleLogSpy.mockClear();
          
          // Save the location
          const result = saveLocation(userEmail, location);
          
          // Verify save was successful
          expect(result.success).toBe(true);
          
          // Verify console.log was called
          expect(consoleLogSpy).toHaveBeenCalled();
          
          // Find the log call that contains '[Location Manager] Saving location:'
          const savingLogCall = consoleLogSpy.mock.calls.find(call => 
            call[0] && call[0].includes('[Location Manager]') && call[0].includes('Saving location')
          );
          
          expect(savingLogCall).toBeDefined();
          expect(savingLogCall[1]).toBeDefined();
          expect(savingLogCall[1].userEmail).toBe(userEmail);
          expect(savingLogCall[1].location).toBeDefined();
          expect(savingLogCall[1].location.name).toBe(location.name);
          
          // Find the success log call
          const successLogCall = consoleLogSpy.mock.calls.find(call => 
            call[0] && call[0].includes('[Location Manager]') && call[0].includes('saved successfully')
          );
          
          expect(successLogCall).toBeDefined();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 49: Update operation logging
   * Validates: Requirements 10.2
   * 
   * Property: For any location update operation, a console log should be produced 
   * containing both the old and new location data
   */
  it('Property 49: Update operation logging', () => {
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
          // Clear storage and reset spies
          const key = `weatherAppLocations_${userEmail}`;
          localStorage.removeItem(key);
          clearInMemoryStorage();
          
          // Save the location first
          const saveResult = saveLocation(userEmail, location);
          expect(saveResult.success).toBe(true);
          
          const locationId = saveResult.location.id;
          
          // Clear spy to focus on update logs
          consoleLogSpy.mockClear();
          
          // Update the location
          const updateResult = updateLocation(userEmail, locationId, { name: newName });
          
          // Verify update was successful
          expect(updateResult.success).toBe(true);
          
          // Verify console.log was called
          expect(consoleLogSpy).toHaveBeenCalled();
          
          // Find the log call that contains '[Location Manager] Updating location:'
          const updateLogCall = consoleLogSpy.mock.calls.find(call => 
            call[0] && call[0].includes('[Location Manager]') && call[0].includes('Updating location')
          );
          
          expect(updateLogCall).toBeDefined();
          expect(updateLogCall[1]).toBeDefined();
          expect(updateLogCall[1].userEmail).toBe(userEmail);
          expect(updateLogCall[1].oldLocation).toBeDefined();
          expect(updateLogCall[1].oldLocation.name).toBe(location.name);
          expect(updateLogCall[1].newLocation).toBeDefined();
          expect(updateLogCall[1].newLocation.name).toBe(newName);
          
          // Find the success log call
          const successLogCall = consoleLogSpy.mock.calls.find(call => 
            call[0] && call[0].includes('[Location Manager]') && call[0].includes('updated successfully')
          );
          
          expect(successLogCall).toBeDefined();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 50: Delete operation logging
   * Validates: Requirements 10.3
   * 
   * Property: For any location delete operation, a console log should be produced 
   * containing the deleted location data and user email
   */
  it('Property 50: Delete operation logging', () => {
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
          // Clear storage and reset spies
          const key = `weatherAppLocations_${userEmail}`;
          localStorage.removeItem(key);
          clearInMemoryStorage();
          
          // Save the location first
          const saveResult = saveLocation(userEmail, location);
          expect(saveResult.success).toBe(true);
          
          const locationId = saveResult.location.id;
          
          // Clear spy to focus on delete logs
          consoleLogSpy.mockClear();
          
          // Delete the location
          const deleteResult = deleteLocation(userEmail, locationId);
          
          // Verify delete was successful
          expect(deleteResult.success).toBe(true);
          
          // Verify console.log was called
          expect(consoleLogSpy).toHaveBeenCalled();
          
          // Find the log call that contains '[Location Manager] Deleting location:'
          const deleteLogCall = consoleLogSpy.mock.calls.find(call => 
            call[0] && call[0].includes('[Location Manager]') && call[0].includes('Deleting location')
          );
          
          expect(deleteLogCall).toBeDefined();
          expect(deleteLogCall[1]).toBeDefined();
          expect(deleteLogCall[1].userEmail).toBe(userEmail);
          expect(deleteLogCall[1].locationId).toBe(locationId);
          expect(deleteLogCall[1].location).toBeDefined();
          expect(deleteLogCall[1].location.name).toBe(location.name);
          
          // Find the success log call
          const successLogCall = consoleLogSpy.mock.calls.find(call => 
            call[0] && call[0].includes('[Location Manager]') && call[0].includes('deleted successfully')
          );
          
          expect(successLogCall).toBeDefined();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 51: Load operation logging
   * Validates: Requirements 10.4
   * 
   * Property: For any locations load operation from localStorage, a console log should be 
   * produced containing the count and list of locations
   */
  it('Property 51: Load operation logging', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            coordinates: fc.record({
              latitude: fc.double({ min: -90, max: 90, noNaN: true }),
              longitude: fc.double({ min: -180, max: 180, noNaN: true })
            }),
            query: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (userEmail, locations) => {
          // Clear storage and reset spies
          const key = `weatherAppLocations_${userEmail}`;
          localStorage.removeItem(key);
          clearInMemoryStorage();
          
          // Save all locations
          const savedLocationIds = [];
          for (const location of locations) {
            const result = saveLocation(userEmail, location);
            if (result.success) {
              savedLocationIds.push(result.location.id);
            }
          }
          
          // Clear spy to focus on load logs
          consoleLogSpy.mockClear();
          
          // Load locations
          const loadedLocations = loadLocations(userEmail);
          
          // Verify console.log was called
          expect(consoleLogSpy).toHaveBeenCalled();
          
          // Find the log call that contains '[Location Manager] Loaded locations:'
          const loadLogCall = consoleLogSpy.mock.calls.find(call => 
            call[0] && call[0].includes('[Location Manager]') && call[0].includes('Loaded locations')
          );
          
          expect(loadLogCall).toBeDefined();
          expect(loadLogCall[1]).toBeDefined();
          expect(loadLogCall[1].userEmail).toBe(userEmail);
          expect(loadLogCall[1].count).toBe(savedLocationIds.length);
          expect(loadLogCall[1].locations).toBeDefined();
          expect(Array.isArray(loadLogCall[1].locations)).toBe(true);
          expect(loadLogCall[1].locations.length).toBe(savedLocationIds.length);
          
          // Verify loaded locations match saved locations
          expect(loadedLocations.length).toBe(savedLocationIds.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 52: localStorage error logging
   * Validates: Requirements 10.5
   * 
   * Property: For any localStorage operation failure, a console log should be produced 
   * containing the full error details
   */
  it('Property 52: localStorage error logging', () => {
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
          
          // Clear spies
          consoleWarnSpy.mockClear();
          consoleErrorSpy.mockClear();
          
          // Mock localStorage using vi.spyOn to throw an error
          const testError = new Error('localStorage unavailable');
          
          const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw testError;
          });
          
          const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw testError;
          });
          
          // Save location should trigger error logging
          const result = saveLocation(userEmail, location);
          
          // Should still succeed with in-memory fallback
          expect(result.success).toBe(true);
          
          // Verify console.warn or console.error was called with error details
          // (console.warn for non-quota errors, console.error for quota errors)
          const warnCalled = consoleWarnSpy.mock.calls.length > 0;
          const errorCalled = consoleErrorSpy.mock.calls.length > 0;
          
          expect(warnCalled || errorCalled).toBe(true);
          
          // Find the log call that contains '[Location Storage]' and error
          const errorLogCall = consoleWarnSpy.mock.calls.find(call => 
            call[0] && call[0].includes('[Location Storage]') && call[0].includes('localStorage unavailable')
          ) || consoleErrorSpy.mock.calls.find(call => 
            call[0] && call[0].includes('[Location Storage]')
          );
          
          expect(errorLogCall).toBeDefined();
          expect(errorLogCall[1]).toBe(testError);
          
          // Restore localStorage
          setItemSpy.mockRestore();
          getItemSpy.mockRestore();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
