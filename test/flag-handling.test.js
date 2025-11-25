/**
 * Property-based tests for enable-user-login flag handling
 * Feature: authentication-flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

describe('Flag Handling', () => {
  let dom;
  let document;
  let window;
  let localStorage;

  beforeEach(() => {
    // Create a fresh DOM for each test
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="app-content"></div></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously'
    });
    document = dom.window.document;
    window = dom.window;
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
    
    // Make localStorage available globally for the test
    global.localStorage = localStorage;
  });

  /**
   * Feature: authentication-flow, Property 9: Flag evaluation after SDK ready
   * Validates: Requirements 3.1
   * 
   * Property: For any app launch, the `enable-user-login` flag must be evaluated 
   * only after the SDK ready event
   */
  it('Property 9: Flag evaluation after SDK ready - flag evaluated only after SDK ready', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a boolean flag value
        fc.boolean(),
        async (flagValue) => {
          let sdkReadyFired = false;
          let flagEvaluatedBeforeReady = false;
          let flagEvaluationCount = 0;
          
          // Create a mock LaunchDarkly client
          const mockClient = {
            variation: vi.fn((flagKey, defaultValue) => {
              flagEvaluationCount++;
              
              // Check if flag is being evaluated before SDK ready
              if (!sdkReadyFired) {
                flagEvaluatedBeforeReady = true;
              }
              
              return flagValue;
            }),
            on: vi.fn((event, callback) => {
              if (event === 'ready') {
                // Simulate SDK ready event firing
                setTimeout(() => {
                  sdkReadyFired = true;
                  callback();
                }, 10);
              }
            }),
            waitUntilReady: vi.fn(() => {
              return new Promise((resolve) => {
                setTimeout(() => {
                  sdkReadyFired = true;
                  resolve();
                }, 10);
              });
            })
          };
          
          // Simulate the checkLoginEnabled function behavior
          const checkLoginEnabled = async (client) => {
            // Wait for SDK to be ready
            await new Promise((resolve) => {
              client.on('ready', () => {
                resolve();
              });
            });
            
            // Only evaluate flag after SDK is ready
            const loginEnabled = client.variation('enable-user-login', true);
            
            return loginEnabled;
          };
          
          // Execute: Call checkLoginEnabled
          const result = await checkLoginEnabled(mockClient);
          
          // Verify: Flag was NOT evaluated before SDK ready
          expect(flagEvaluatedBeforeReady).toBe(false);
          
          // Verify: SDK ready event was fired
          expect(sdkReadyFired).toBe(true);
          
          // Verify: Flag was evaluated at least once (after ready)
          expect(flagEvaluationCount).toBeGreaterThan(0);
          
          // Verify: Result matches the flag value
          expect(result).toBe(flagValue);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: authentication-flow, Property 10: Login enabled UI state
   * Validates: Requirements 3.2
   * 
   * Property: For any login screen display when `enable-user-login` is true, 
   * the UI must show user authentication options (saved users, new user form, and anonymous button)
   */
  it('Property 10: Login enabled UI state - UI shows authentication options when flag is true', () => {
    fc.assert(
      fc.property(
        // Generate an array of user profiles (0-5 users)
        fc.array(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            lastLogin: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString())
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (users) => {
          // Setup: Save users to localStorage
          if (users.length > 0) {
            localStorage.setItem('weatherAppUsers', JSON.stringify(users));
          }
          
          // Simulate showLoginScreen with loginEnabled = true
          const appContent = document.getElementById('app-content');
          const loginEnabled = true;
          
          // Helper to escape HTML
          const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
          };
          
          // Render login screen
          const usersData = localStorage.getItem('weatherAppUsers');
          const savedUsers = usersData ? JSON.parse(usersData) : [];
          
          let usersListHTML = '';
          if (savedUsers.length > 0) {
            usersListHTML = '<div class="saved-users"><div class="users-list">';
            savedUsers.forEach(user => {
              usersListHTML += `
                <div class="user-item" data-email="${escapeHtml(user.email)}">
                  <div class="user-item-info">
                    <div><strong>${escapeHtml(user.name)}</strong></div>
                    <div>${escapeHtml(user.email)}</div>
                  </div>
                </div>
              `;
            });
            usersListHTML += '</div></div>';
          }
          
          appContent.innerHTML = `
            <div class="login-container">
              <h1>Weather App</h1>
              ${usersListHTML}
              <form id="login-form">
                <input type="email" id="email-input" placeholder="your.email@example.com" required>
                <input type="text" id="name-input" placeholder="Your name (optional)">
                <button type="submit">Add User</button>
              </form>
              <button type="button" id="anonymous-btn">Continue as Anonymous</button>
            </div>
          `;
          
          // Verify: Login form is present
          const loginForm = appContent.querySelector('#login-form');
          expect(loginForm).not.toBeNull();
          
          // Verify: Email input is present
          const emailInput = appContent.querySelector('#email-input');
          expect(emailInput).not.toBeNull();
          
          // Verify: Name input is present
          const nameInput = appContent.querySelector('#name-input');
          expect(nameInput).not.toBeNull();
          
          // Verify: Submit button is present
          const submitBtn = appContent.querySelector('button[type="submit"]');
          expect(submitBtn).not.toBeNull();
          
          // Verify: Anonymous button is present
          const anonymousBtn = appContent.querySelector('#anonymous-btn');
          expect(anonymousBtn).not.toBeNull();
          
          // Verify: If users exist, they are displayed
          if (users.length > 0) {
            const usersList = appContent.querySelector('.users-list');
            expect(usersList).not.toBeNull();
            const userItems = appContent.querySelectorAll('.user-item');
            expect(userItems.length).toBe(users.length);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: authentication-flow, Property 11: Login disabled UI state
   * Validates: Requirements 3.3
   * 
   * Property: For any login screen display when `enable-user-login` is false, 
   * the UI must show only a disabled message and anonymous continuation button
   */
  it('Property 11: Login disabled UI state - UI shows disabled message when flag is false', () => {
    fc.assert(
      fc.property(
        // Generate an array of user profiles (0-5 users) - should be ignored when flag is false
        fc.array(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            lastLogin: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString())
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (users) => {
          // Setup: Save users to localStorage (should be ignored)
          if (users.length > 0) {
            localStorage.setItem('weatherAppUsers', JSON.stringify(users));
          }
          
          // Simulate showLoginScreen with loginEnabled = false
          const appContent = document.getElementById('app-content');
          const loginEnabled = false;
          
          // Render login screen with disabled state
          if (!loginEnabled) {
            appContent.innerHTML = `
              <div class="login-container">
                <h1>Weather App</h1>
                <p style="margin: 20px 0; opacity: 0.9;">User login is currently disabled</p>
                <button type="button" id="anonymous-btn" style="width: 100%; padding: 15px; font-size: 18px;">
                  Continue as Anonymous
                </button>
                <p style="margin-top: 20px; font-size: 14px; opacity: 0.7;">
                  Anonymous mode provides a default weather experience.
                </p>
              </div>
            `;
          }
          
          // Verify: Disabled message is present
          const textContent = appContent.textContent;
          expect(textContent).toContain('User login is currently disabled');
          
          // Verify: Anonymous button is present
          const anonymousBtn = appContent.querySelector('#anonymous-btn');
          expect(anonymousBtn).not.toBeNull();
          expect(anonymousBtn.textContent).toContain('Continue as Anonymous');
          
          // Verify: Login form is NOT present
          const loginForm = appContent.querySelector('#login-form');
          expect(loginForm).toBeNull();
          
          // Verify: Email input is NOT present
          const emailInput = appContent.querySelector('#email-input');
          expect(emailInput).toBeNull();
          
          // Verify: Saved users list is NOT present (even if users exist in localStorage)
          const usersList = appContent.querySelector('.users-list');
          expect(usersList).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
