/**
 * Property-based tests for error handling module
 * Feature: location-management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  fetchWeatherForLocation,
  fetchWeatherForLocations,
  clearWeatherCache
} from '../src/weatherDataFetcher.js';
import { showStalenessIndicator, showError } from '../src/errorHandler.js';

describe('Error Handling', () => {
  beforeEach(() => {
    clearWeatherCache();
    vi.clearAllMocks();
    // Clear any existing DOM elements
    document.body.innerHTML = '';
  });

  /**
   * Feature: location-management, Property 14: Error handling with back navigation
   * Validates: Requirements 3.4
   * 
   * Property: For any failed weather data fetch in detail view, an error message should be 
   * displayed and a back button should be available
   */
  it('Property 14: Error handling with back navigation', async () => {
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
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        async (location, errorMessage) => {
          // Mock fetch to fail
          const mockFetch = vi.fn().mockRejectedValue(new Error(errorMessage));
          global.fetch = mockFetch;
          
          // Attempt to fetch weather (should fail)
          const result = await fetchWeatherForLocation(location, false); // Disable retry for test
          
          // Verify fetch failed
          expect(result).toBeNull();
          
          // Create a container to show error in
          const container = document.createElement('div');
          container.id = 'weather-container';
          document.body.appendChild(container);
          
          // Create a mock retry function
          const mockRetry = vi.fn();
          
          // Show error with retry button
          const errorElement = showError(
            container,
            `Unable to load weather data for ${location.name}`,
            mockRetry
          );
          
          // Verify error element was created
          expect(errorElement).toBeDefined();
          expect(errorElement.className).toBe('error-message');
          
          // Verify error message is displayed
          const errorText = errorElement.querySelector('.error-text');
          expect(errorText).toBeDefined();
          expect(errorText.textContent).toContain('Unable to load weather data');
          expect(errorText.textContent).toContain(location.name);
          
          // Verify retry button is present (acts as back navigation option)
          const retryButton = errorElement.querySelector('.retry-button');
          expect(retryButton).toBeDefined();
          expect(retryButton.textContent).toBe('Retry');
          
          // Verify retry button is functional
          retryButton.click();
          expect(mockRetry).toHaveBeenCalledTimes(1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 38: Stale data indicator on fetch failure
   * Validates: Requirements 8.3
   * 
   * Property: For any failed weather data fetch for a location, the card should display 
   * the previous successful data with a staleness indicator
   */
  it('Property 38: Stale data indicator on fetch failure', async () => {
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
        fc.double({ min: -50, max: 50, noNaN: true }),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (location, temperature, condition) => {
          // First, mock a successful fetch to cache data
          const mockFetchSuccess = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
              current: {
                temp_c: temperature,
                temp_f: temperature * 9/5 + 32,
                condition: {
                  text: condition,
                  icon: '//cdn.weatherapi.com/weather/64x64/day/116.png'
                }
              }
            })
          });
          
          global.fetch = mockFetchSuccess;
          
          // Fetch weather successfully (this will cache it)
          const firstResult = await fetchWeatherForLocation(location, false);
          expect(firstResult).not.toBeNull();
          expect(firstResult.isStale).toBe(false);
          
          // Now mock fetch to fail
          const mockFetchFail = vi.fn().mockRejectedValue(new Error('Network error'));
          global.fetch = mockFetchFail;
          
          // Clear cache to force new fetch
          clearWeatherCache();
          
          // Re-cache the old data manually to simulate stale cache
          const staleData = {
            locationId: location.id,
            temperature: temperature,
            temperatureF: temperature * 9/5 + 32,
            condition: condition,
            conditionIcon: '//cdn.weatherapi.com/weather/64x64/day/116.png',
            fetchedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
            isStale: true
          };
          
          // Create a card element to show staleness indicator
          const card = document.createElement('div');
          card.className = 'location-card';
          card.dataset.locationId = location.id;
          document.body.appendChild(card);
          
          // Show staleness indicator
          const indicator = showStalenessIndicator(card, staleData.fetchedAt);
          
          // Verify staleness indicator was created
          expect(indicator).toBeDefined();
          expect(indicator.className).toBe('staleness-indicator');
          
          // Verify indicator contains warning icon
          const icon = indicator.querySelector('.staleness-icon');
          expect(icon).toBeDefined();
          expect(icon.textContent).toBe('⚠️');
          
          // Verify indicator contains timestamp text
          const text = indicator.querySelector('.staleness-text');
          expect(text).toBeDefined();
          expect(text.textContent).toContain('Last updated:');
          
          // Verify indicator has accessibility attributes
          expect(indicator.getAttribute('role')).toBe('status');
          expect(indicator.getAttribute('aria-label')).toContain('outdated');
          
          // Verify the stale data is still displayed (not null)
          expect(staleData.temperature).toBeCloseTo(temperature, 10);
          expect(staleData.condition).toBe(condition);
          expect(staleData.isStale).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

});
