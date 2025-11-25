/**
 * Property-based tests for weather data fetcher module
 * Feature: location-management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  fetchWeatherForLocation,
  fetchWeatherForLocations,
  getCachedWeather,
  clearWeatherCache
} from '../src/weatherDataFetcher.js';

describe('Weather Data Fetcher', () => {
  beforeEach(() => {
    clearWeatherCache();
    vi.clearAllMocks();
  });

  /**
   * Feature: location-management, Property 13: Weather data fetch on detail view
   * Validates: Requirements 3.3
   * 
   * Property: For any transition to detail view for a location, a WeatherAPI call 
   * should be made with that location's coordinates
   */
  it('Property 13: Weather data fetch on detail view', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          coordinates: fc.record({
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true })
          }),
          query: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
        }),
        async (location) => {
          // Mock fetch to capture the API call
          const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
              current: {
                temp_c: 20,
                temp_f: 68,
                condition: {
                  text: 'Partly cloudy',
                  icon: '//cdn.weatherapi.com/weather/64x64/day/116.png'
                }
              }
            })
          });
          
          global.fetch = mockFetch;
          
          // Fetch weather for the location
          const result = await fetchWeatherForLocation(location);
          
          // Verify fetch was called
          expect(mockFetch).toHaveBeenCalled();
          
          // Verify the API call includes the location's coordinates
          const callUrl = mockFetch.mock.calls[0][0];
          expect(callUrl).toContain(location.coordinates.latitude.toString());
          expect(callUrl).toContain(location.coordinates.longitude.toString());
          
          // Verify result contains weather data
          if (result) {
            expect(result.locationId).toBe(location.id);
            expect(result.temperature).toBeDefined();
            expect(result.condition).toBeDefined();
            expect(result.conditionIcon).toBeDefined();
            expect(result.fetchedAt).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 18: Cached data on list view return
   * Validates: Requirements 4.3
   * 
   * Property: For any transition back to list view, no new WeatherAPI calls should be made 
   * (existing cached data should be used)
   */
  it('Property 18: Cached data on list view return', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          coordinates: fc.record({
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true })
          }),
          query: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
        }),
        async (location) => {
          // Mock fetch
          const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
              current: {
                temp_c: 20,
                temp_f: 68,
                condition: {
                  text: 'Partly cloudy',
                  icon: '//cdn.weatherapi.com/weather/64x64/day/116.png'
                }
              }
            })
          });
          
          global.fetch = mockFetch;
          
          // First fetch - should call API
          const firstResult = await fetchWeatherForLocation(location);
          expect(mockFetch).toHaveBeenCalledTimes(1);
          expect(firstResult).not.toBeNull();
          
          // Get cached data - should not call API
          mockFetch.mockClear();
          const cachedResult = getCachedWeather(location.id);
          expect(mockFetch).not.toHaveBeenCalled();
          expect(cachedResult).not.toBeNull();
          
          // Verify cached data matches first fetch
          expect(cachedResult.locationId).toBe(firstResult.locationId);
          expect(cachedResult.temperature).toBe(firstResult.temperature);
          expect(cachedResult.condition).toBe(firstResult.condition);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 37: Display most recent weather data
   * Validates: Requirements 8.2
   * 
   * Property: For any location card, the displayed temperature and condition should match 
   * the most recently fetched weather data for that location
   */
  it('Property 37: Display most recent weather data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          coordinates: fc.record({
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true })
          }),
          query: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
        }),
        fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (location, newTemp, newCondition) => {
          // Mock fetch with initial data
          let callCount = 0;
          const mockFetch = vi.fn().mockImplementation(() => {
            callCount++;
            const temp = callCount === 1 ? 20 : newTemp;
            const condition = callCount === 1 ? 'Partly cloudy' : newCondition;
            
            return Promise.resolve({
              ok: true,
              json: async () => ({
                current: {
                  temp_c: temp,
                  temp_f: temp * 9/5 + 32,
                  condition: {
                    text: condition,
                    icon: '//cdn.weatherapi.com/weather/64x64/day/116.png'
                  }
                }
              })
            });
          });
          
          global.fetch = mockFetch;
          
          // First fetch
          const firstResult = await fetchWeatherForLocation(location);
          expect(firstResult.temperature).toBe(20);
          expect(firstResult.condition).toBe('Partly cloudy');
          
          // Clear cache to force new fetch
          clearWeatherCache();
          
          // Second fetch - should get new data
          const secondResult = await fetchWeatherForLocation(location);
          expect(secondResult.temperature).toBeCloseTo(newTemp, 10);
          expect(secondResult.condition).toBe(newCondition);
          
          // Verify the most recent data is what we get from cache
          const cachedResult = getCachedWeather(location.id);
          expect(cachedResult.temperature).toBeCloseTo(newTemp, 10);
          expect(cachedResult.condition).toBe(newCondition);
        }
      ),
      { numRuns: 100 }
    );
  });
});
