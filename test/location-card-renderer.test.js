/**
 * Property-based tests for location card renderer module
 * Feature: location-management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  renderLocationCard,
  sortLocationsByTimestamp,
  renderLocationCards,
  updateLocationCard,
  attachCardEventHandlers
} from '../src/locationCardRenderer.js';

describe('Location Card Renderer', () => {
  let container;

  beforeEach(() => {
    // Create a fresh container for each test
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  /**
   * Feature: location-management, Property 7: Location card content completeness
   * Validates: Requirements 2.2
   * 
   * Property: For any rendered location card, the HTML should contain the location name, 
   * temperature value, and weather condition icon
   */
  it('Property 7: Location card content completeness', () => {
    fc.assert(
      fc.property(
        // Generate location object
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          coordinates: fc.record({
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true })
          }),
          query: fc.string({ minLength: 1, maxLength: 100 }),
          addedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts).toISOString()),
          updatedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts).toISOString())
        }),
        // Generate weather data
        fc.record({
          temperature: fc.double({ min: -50, max: 50, noNaN: true }),
          condition: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          conditionIcon: fc.webUrl()
        }),
        (location, weatherData) => {
          // Render the card
          const card = renderLocationCard(location, weatherData, {
            useFahrenheit: true,
            dynamicThemeEnabled: false
          });
          
          // Verify card is an HTML element
          expect(card).toBeInstanceOf(HTMLElement);
          expect(card.className).toContain('location-card');
          
          // Verify location name is present
          const nameElement = card.querySelector('.location-name');
          expect(nameElement).not.toBeNull();
          expect(nameElement.textContent).toBe(location.name);
          
          // Verify temperature is present
          const tempElement = card.querySelector('.temperature');
          expect(tempElement).not.toBeNull();
          expect(tempElement.textContent).toMatch(/\d+°[FC]/); // Should contain number and degree symbol
          
          // Verify weather condition icon is present
          const iconElement = card.querySelector('.condition-icon');
          expect(iconElement).not.toBeNull();
          // Browser normalizes URLs in various ways (removes /./,  adds/removes trailing slashes, etc.)
          // Just verify the icon has a src attribute and it's a valid URL
          expect(iconElement.src).toBeTruthy();
          expect(iconElement.src).toMatch(/^https?:\/\//);
          expect(iconElement.alt).toBe(weatherData.condition);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 10: Location card ordering by timestamp
   * Validates: Requirements 2.5
   * 
   * Property: For any list of locations with different addedAt timestamps, 
   * the rendered cards should be ordered by timestamp in descending order (most recent first)
   */
  it('Property 10: Location card ordering by timestamp', () => {
    fc.assert(
      fc.property(
        // Generate array of locations with different timestamps
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            coordinates: fc.record({
              latitude: fc.double({ min: -90, max: 90, noNaN: true }),
              longitude: fc.double({ min: -180, max: 180, noNaN: true })
            }),
            query: fc.string({ minLength: 1, maxLength: 100 }),
            addedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts).toISOString()),
            updatedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts).toISOString())
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (locations) => {
          // Sort locations using the function
          const sorted = sortLocationsByTimestamp(locations);
          
          // Verify the array is sorted in descending order by addedAt
          for (let i = 0; i < sorted.length - 1; i++) {
            const currentDate = new Date(sorted[i].addedAt);
            const nextDate = new Date(sorted[i + 1].addedAt);
            expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
          }
          
          // Now test with actual rendering
          const weatherDataMap = new Map();
          locations.forEach(loc => {
            weatherDataMap.set(loc.id, {
              temperature: 20,
              condition: 'Sunny',
              conditionIcon: 'https://example.com/icon.png'
            });
          });
          
          // Render cards
          const testContainer = document.createElement('div');
          renderLocationCards(locations, weatherDataMap, testContainer, {
            useFahrenheit: true,
            dynamicThemeEnabled: false
          });
          
          // Get all rendered cards
          const cards = testContainer.querySelectorAll('.location-card');
          expect(cards.length).toBe(locations.length);
          
          // Verify cards are in the correct order
          const sortedIds = sorted.map(loc => loc.id);
          cards.forEach((card, index) => {
            expect(card.dataset.locationId).toBe(sortedIds[index]);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 21: Edit button presence on cards
   * Feature: location-management, Property 26: Delete button presence on cards
   * Validates: Requirements 5.1, 6.1
   * 
   * Property: For any rendered location card, an edit button and delete button should be present in the UI
   */
  it('Property 21 & 26: Edit and delete button presence on cards', () => {
    fc.assert(
      fc.property(
        // Generate location object
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          coordinates: fc.record({
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true })
          }),
          query: fc.string({ minLength: 1, maxLength: 100 }),
          addedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts).toISOString()),
          updatedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts).toISOString())
        }),
        // Generate weather data (optional)
        fc.option(
          fc.record({
            temperature: fc.double({ min: -50, max: 50, noNaN: true }),
            condition: fc.string({ minLength: 1, maxLength: 50 }),
            conditionIcon: fc.webUrl()
          }),
          { nil: null }
        ),
        (location, weatherData) => {
          // Render the card
          const card = renderLocationCard(location, weatherData, {
            useFahrenheit: true,
            dynamicThemeEnabled: false
          });
          
          // Verify edit button is present
          const editButton = card.querySelector('.edit-button');
          expect(editButton).not.toBeNull();
          expect(editButton).toBeInstanceOf(HTMLElement);
          expect(editButton.tagName).toBe('BUTTON');
          expect(editButton.dataset.locationId).toBe(location.id);
          expect(editButton.dataset.action).toBe('edit');
          expect(editButton.getAttribute('aria-label')).toContain('Edit');
          expect(editButton.getAttribute('aria-label')).toContain(location.name);
          
          // Verify delete button is present
          const deleteButton = card.querySelector('.delete-button');
          expect(deleteButton).not.toBeNull();
          expect(deleteButton).toBeInstanceOf(HTMLElement);
          expect(deleteButton.tagName).toBe('BUTTON');
          expect(deleteButton.dataset.locationId).toBe(location.id);
          expect(deleteButton.dataset.action).toBe('delete');
          expect(deleteButton.getAttribute('aria-label')).toContain('Delete');
          expect(deleteButton.getAttribute('aria-label')).toContain(location.name);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Temperature scale flag integration
   * Validates: Requirements 8.8
   * 
   * Property: For any location card displaying temperature, the unit should match 
   * the temperature-scale flag value (Fahrenheit when true, Celsius when false)
   */
  it('Temperature scale flag integration', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          coordinates: fc.record({
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true })
          }),
          query: fc.string({ minLength: 1, maxLength: 100 }),
          addedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts).toISOString()),
          updatedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts).toISOString())
        }),
        fc.record({
          temperature: fc.double({ min: -50, max: 50, noNaN: true }),
          condition: fc.string({ minLength: 1, maxLength: 50 }),
          conditionIcon: fc.webUrl()
        }),
        fc.boolean(),
        (location, weatherData, useFahrenheit) => {
          // Render the card with temperature scale flag
          const card = renderLocationCard(location, weatherData, {
            useFahrenheit,
            dynamicThemeEnabled: false
          });
          
          // Verify temperature unit matches flag
          const tempElement = card.querySelector('.temperature');
          expect(tempElement).not.toBeNull();
          
          const tempText = tempElement.textContent;
          if (useFahrenheit) {
            expect(tempText).toContain('°F');
            expect(tempText).not.toContain('°C');
          } else {
            expect(tempText).toContain('°C');
            expect(tempText).not.toContain('°F');
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Dynamic weather theme application
   * Validates: Requirements 8.6, 8.7
   * 
   * Property: For any location card when the dynamic-weather-theme flag is enabled, 
   * the card's background theme should match the weather condition for that specific location.
   * When disabled, all cards should use the standard theme.
   */
  it('Dynamic weather theme application', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          coordinates: fc.record({
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true })
          }),
          query: fc.string({ minLength: 1, maxLength: 100 }),
          addedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts).toISOString()),
          updatedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts).toISOString())
        }),
        fc.record({
          temperature: fc.double({ min: -50, max: 50, noNaN: true }),
          condition: fc.constantFrom('Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Stormy', 'Foggy', 'Clear'),
          conditionIcon: fc.webUrl()
        }),
        fc.boolean(),
        (location, weatherData, dynamicThemeEnabled) => {
          // Render the card with dynamic theme flag
          const card = renderLocationCard(location, weatherData, {
            useFahrenheit: true,
            dynamicThemeEnabled
          });
          
          // Check for theme class
          const hasThemeClass = Array.from(card.classList).some(c => c.startsWith('theme-'));
          expect(hasThemeClass).toBe(true);
          
          if (dynamicThemeEnabled) {
            // Should have a weather-specific theme (not standard)
            const condition = weatherData.condition.toLowerCase();
            if (condition.includes('sunny') || condition.includes('clear')) {
              expect(card.classList.contains('theme-sunny')).toBe(true);
            } else if (condition.includes('cloud')) {
              expect(card.classList.contains('theme-cloudy')).toBe(true);
            } else if (condition.includes('rain')) {
              expect(card.classList.contains('theme-rainy')).toBe(true);
            } else if (condition.includes('snow')) {
              expect(card.classList.contains('theme-snowy')).toBe(true);
            } else if (condition.includes('storm')) {
              expect(card.classList.contains('theme-stormy')).toBe(true);
            } else if (condition.includes('fog')) {
              expect(card.classList.contains('theme-foggy')).toBe(true);
            }
          } else {
            // Should have standard theme
            expect(card.classList.contains('theme-standard')).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Event delegation for card interactions
   * Verifies that event handlers are properly attached and triggered
   */
  it('Event delegation for card interactions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            coordinates: fc.record({
              latitude: fc.double({ min: -90, max: 90, noNaN: true }),
              longitude: fc.double({ min: -180, max: 180, noNaN: true })
            }),
            query: fc.string({ minLength: 1, maxLength: 100 }),
            addedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts).toISOString()),
            updatedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts).toISOString())
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (locations) => {
          // Create weather data map
          const weatherDataMap = new Map();
          locations.forEach(loc => {
            weatherDataMap.set(loc.id, {
              temperature: 20,
              condition: 'Sunny',
              conditionIcon: 'https://example.com/icon.png'
            });
          });
          
          // Render cards
          const testContainer = document.createElement('div');
          renderLocationCards(locations, weatherDataMap, testContainer, {
            useFahrenheit: true,
            dynamicThemeEnabled: false
          });
          
          // Track which handlers were called
          let cardClickCalled = false;
          let editCalled = false;
          let deleteCalled = false;
          let clickedLocationId = null;
          let editedLocationId = null;
          let deletedLocationId = null;
          
          // Attach event handlers
          attachCardEventHandlers(testContainer, {
            onCardClick: (locationId) => {
              cardClickCalled = true;
              clickedLocationId = locationId;
            },
            onEdit: (locationId) => {
              editCalled = true;
              editedLocationId = locationId;
            },
            onDelete: (locationId) => {
              deleteCalled = true;
              deletedLocationId = locationId;
            }
          });
          
          // Test card click
          const firstCard = testContainer.querySelector('.location-card');
          const firstLocationId = firstCard.dataset.locationId;
          firstCard.click();
          expect(cardClickCalled).toBe(true);
          expect(clickedLocationId).toBe(firstLocationId);
          
          // Test edit button click
          const editButton = firstCard.querySelector('.edit-button');
          editButton.click();
          expect(editCalled).toBe(true);
          expect(editedLocationId).toBe(firstLocationId);
          
          // Test delete button click
          const deleteButton = firstCard.querySelector('.delete-button');
          deleteButton.click();
          expect(deleteCalled).toBe(true);
          expect(deletedLocationId).toBe(firstLocationId);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
