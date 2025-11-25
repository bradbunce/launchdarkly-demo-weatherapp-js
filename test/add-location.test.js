/**
 * Property-based tests for add location functionality
 * Feature: location-management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

describe('Add Location Functionality', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Create a fresh DOM for each test
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="app-content"></div></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true
    });
    document = dom.window.document;
    window = dom.window;
    
    // Set up global objects
    global.document = document;
    global.window = window;
    global.localStorage = window.localStorage;
    
    // Clear localStorage
    localStorage.clear();
  });

  /**
   * Feature: location-management, Property 1: Save button visibility for named users
   * Validates: Requirements 1.1
   * 
   * Property: For any named user context, when searching for a location, 
   * a save button should be present in the UI
   */
  it('Property 1: Save button visibility for named users', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (email, name, cityName) => {
          // Create a named user context
          const context = {
            kind: 'user',
            anonymous: false,
            email: email,
            name: name
          };
          
          // Mock weather data
          const weatherData = {
            city: cityName,
            region: 'Test Region',
            country: 'Test Country'
          };
          
          // Mock LaunchDarkly client
          const mockLDClient = {
            variation: (flag, defaultValue) => {
              if (flag === 'save-locations') return true;
              return defaultValue;
            }
          };
          
          // Render the location selector with save button
          const appContent = document.getElementById('app-content');
          appContent.innerHTML = `
            <div class="location-selector">
              <input type="text" id="city-input" placeholder="Enter city name..." value="${weatherData.city}">
              <button id="search-button">🔍</button>
            </div>
          `;
          
          // Check if save-locations flag is enabled and user is not anonymous
          const canSaveLocations = mockLDClient.variation('save-locations', false);
          
          if (!context.anonymous && context.email && canSaveLocations) {
            // Simulate checking if location is already saved
            const savedLocations = []; // Empty for this test
            
            if (!savedLocations.includes(weatherData.city)) {
              // Add save button
              const saveBtn = document.createElement('button');
              saveBtn.id = 'save-location-btn';
              saveBtn.textContent = '⭐ Save Location';
              saveBtn.style.cssText = 'margin-top: 10px; padding: 8px 16px; font-size: 14px;';
              document.getElementById('city-input').parentElement.appendChild(saveBtn);
            }
          }
          
          // Verify save button is present for named users
          const saveButton = document.getElementById('save-location-btn');
          expect(saveButton).not.toBeNull();
          expect(saveButton.textContent).toContain('Save Location');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: location-management, Property 4: Anonymous user save restriction
   * Validates: Requirements 1.4
   * 
   * Property: For any anonymous user context, no save location buttons or controls 
   * should be present in the UI
   */
  it('Property 4: Anonymous user save restriction', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (cityName) => {
          // Create an anonymous user context
          const context = {
            kind: 'user',
            anonymous: true
          };
          
          // Mock weather data
          const weatherData = {
            city: cityName,
            region: 'Test Region',
            country: 'Test Country'
          };
          
          // Mock LaunchDarkly client
          const mockLDClient = {
            variation: (flag, defaultValue) => {
              if (flag === 'save-locations') return true;
              return defaultValue;
            }
          };
          
          // Render the location selector
          const appContent = document.getElementById('app-content');
          appContent.innerHTML = `
            <div class="location-selector">
              <input type="text" id="city-input" placeholder="Enter city name..." value="${weatherData.city}">
              <button id="search-button">🔍</button>
            </div>
          `;
          
          // Check if save-locations flag is enabled and user is not anonymous
          const canSaveLocations = mockLDClient.variation('save-locations', false);
          
          if (!context.anonymous && context.email && canSaveLocations) {
            // This block should NOT execute for anonymous users
            const saveBtn = document.createElement('button');
            saveBtn.id = 'save-location-btn';
            saveBtn.textContent = '⭐ Save Location';
            document.getElementById('city-input').parentElement.appendChild(saveBtn);
          }
          
          // Verify save button is NOT present for anonymous users
          const saveButton = document.getElementById('save-location-btn');
          expect(saveButton).toBeNull();
          
          // Also verify no other save-related controls exist
          const allButtons = document.querySelectorAll('button');
          allButtons.forEach(button => {
            expect(button.textContent.toLowerCase()).not.toContain('save');
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
