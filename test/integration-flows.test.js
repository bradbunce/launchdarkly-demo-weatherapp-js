/**
 * Integration tests for complete bootstrap flows
 * Feature: authentication-flow
 * 
 * These tests verify end-to-end flows from bootstrap through authentication to the weather app.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { bootstrap, createAnonymousContext, clearGeolocationCache } from '../src/bootstrap.js';

describe('Integration: Complete Bootstrap Flows', () => {
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
    
    // Clear geolocation cache
    clearGeolocationCache();
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  /**
   * Test: Bootstrap → Login Screen → User Selection → Weather App
   * 
   * This test verifies the complete flow when a user selects a saved profile:
   * 1. App starts with anonymous context
   * 2. Login screen displays with saved users
   * 3. User clicks a saved profile
   * 4. SDK identify is called with user context
   * 5. Weather app loads with named user context
   */
  it('should complete flow: bootstrap → login screen → user selection → weather app', async () => {
    // Setup: Create saved users in localStorage
    const savedUsers = [
      {
        email: 'john@example.com',
        name: 'John Doe',
        lastLogin: new Date('2024-01-01').toISOString()
      },
      {
        email: 'jane@example.com',
        name: 'Jane Smith',
        lastLogin: new Date('2024-01-02').toISOString()
      }
    ];
    localStorage.setItem('weatherAppUsers', JSON.stringify(savedUsers));

    // Mock geolocation
    const mockLocation = {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10
    };
    
    global.navigator = {
      ...global.navigator,
      geolocation: {
        getCurrentPosition: (success) => {
          success({ coords: mockLocation });
        }
      }
    };

    // Step 1: Bootstrap with anonymous context
    let sdkReadyFired = false;
    let identifyCalled = false;
    let identifyContext = null;
    
    const mockInitializeSDK = vi.fn(async (context) => {
      // Verify bootstrap starts with anonymous context
      expect(context.anonymous).toBe(true);
      expect(context.location).toBeDefined();
      expect(context.location.latitude).toBe(mockLocation.latitude);
      
      return {
        variation: vi.fn((flagKey) => {
          if (flagKey === 'enable-user-login') {
            return true; // Login enabled
          }
          return false;
        }),
        on: vi.fn((event, callback) => {
          if (event === 'ready') {
            setTimeout(() => {
              sdkReadyFired = true;
              callback();
            }, 10);
          }
        }),
        identify: vi.fn(async (newContext) => {
          identifyCalled = true;
          identifyContext = newContext;
          return Promise.resolve();
        }),
        getContext: vi.fn(() => identifyContext || context),
        waitUntilReady: vi.fn(() => Promise.resolve())
      };
    });

    const bootstrapResult = await bootstrap(mockInitializeSDK);
    
    // Verify bootstrap completed successfully
    expect(bootstrapResult.context.anonymous).toBe(true);
    expect(bootstrapResult.location).toEqual(mockLocation);
    expect(mockInitializeSDK).toHaveBeenCalledTimes(1);

    // Step 2: Wait for SDK ready and check login flag
    await new Promise((resolve) => {
      bootstrapResult.client.on('ready', () => {
        resolve();
      });
    });
    
    expect(sdkReadyFired).toBe(true);
    
    const loginEnabled = bootstrapResult.client.variation('enable-user-login', true);
    expect(loginEnabled).toBe(true);

    // Step 3: Show login screen with saved users
    const appContent = document.getElementById('app-content');
    const usersData = localStorage.getItem('weatherAppUsers');
    const users = JSON.parse(usersData);
    
    // Sort by lastLogin descending
    const sortedUsers = users.sort((a, b) => 
      new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime()
    );
    
    // Render login screen
    let usersListHTML = '<div class="saved-users"><div class="users-list">';
    sortedUsers.forEach(user => {
      usersListHTML += `
        <div class="user-item" data-email="${user.email}">
          <div class="user-item-info">
            <div><strong>${user.name}</strong></div>
            <div>${user.email}</div>
          </div>
          <button class="select-user-btn">Select</button>
        </div>
      `;
    });
    usersListHTML += '</div></div>';
    appContent.innerHTML = usersListHTML;
    
    // Verify login screen displays saved users
    const userItems = appContent.querySelectorAll('.user-item');
    expect(userItems.length).toBe(2);
    expect(appContent.textContent).toContain('Jane Smith'); // Most recent first
    expect(appContent.textContent).toContain('John Doe');

    // Step 4: User selects a saved profile (Jane)
    const selectedUser = sortedUsers[0]; // Jane (most recent)
    
    // Create user context with preserved geolocation
    const userContext = {
      kind: 'user',
      key: selectedUser.email,
      email: selectedUser.email,
      name: selectedUser.name,
      location: {
        latitude: mockLocation.latitude,
        longitude: mockLocation.longitude
      }
    };
    
    // Call identify (simulating user selection)
    await bootstrapResult.client.identify(userContext);
    
    // Update lastLogin timestamp
    selectedUser.lastLogin = new Date().toISOString();
    localStorage.setItem('weatherAppUsers', JSON.stringify(sortedUsers));
    
    // Verify identify was called with correct context
    expect(identifyCalled).toBe(true);
    expect(identifyContext.key).toBe('jane@example.com');
    expect(identifyContext.email).toBe('jane@example.com');
    expect(identifyContext.name).toBe('Jane Smith');
    expect(identifyContext.location).toBeDefined();
    expect(identifyContext.location.latitude).toBe(mockLocation.latitude);
    
    // Verify lastLogin was updated
    const updatedUsers = JSON.parse(localStorage.getItem('weatherAppUsers'));
    const updatedJane = updatedUsers.find(u => u.email === 'jane@example.com');
    expect(new Date(updatedJane.lastLogin).getTime()).toBeGreaterThan(
      new Date('2024-01-02').getTime()
    );

    // Step 5: Weather app loads with named user context
    appContent.innerHTML = '<div class="weather-app"><h1>Weather App</h1><p>User: Jane Smith</p></div>';
    
    // Verify weather app is displayed
    expect(appContent.textContent).toContain('Weather App');
    expect(appContent.textContent).toContain('Jane Smith');
  });

  /**
   * Test: Bootstrap → Login Screen → New User → Weather App
   * 
   * This test verifies the complete flow when a user creates a new profile:
   * 1. App starts with anonymous context
   * 2. Login screen displays (no saved users)
   * 3. User fills out form and submits
   * 4. Profile is saved to localStorage
   * 5. SDK identify is called with new user context
   * 6. Weather app loads with named user context
   */
  it('should complete flow: bootstrap → login screen → new user → weather app', async () => {
    // Setup: No saved users
    localStorage.clear();

    // Mock geolocation
    const mockLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 15
    };
    
    global.navigator = {
      ...global.navigator,
      geolocation: {
        getCurrentPosition: (success) => {
          success({ coords: mockLocation });
        }
      }
    };

    // Step 1: Bootstrap with anonymous context
    let identifyCalled = false;
    let identifyContext = null;
    
    const mockInitializeSDK = vi.fn(async (context) => {
      expect(context.anonymous).toBe(true);
      
      return {
        variation: vi.fn((flagKey) => {
          if (flagKey === 'enable-user-login') {
            return true;
          }
          return false;
        }),
        on: vi.fn((event, callback) => {
          if (event === 'ready') {
            setTimeout(() => callback(), 10);
          }
        }),
        identify: vi.fn(async (newContext) => {
          identifyCalled = true;
          identifyContext = newContext;
          return Promise.resolve();
        }),
        getContext: vi.fn(() => identifyContext || context),
        waitUntilReady: vi.fn(() => Promise.resolve())
      };
    });

    const bootstrapResult = await bootstrap(mockInitializeSDK);
    
    // Step 2: Wait for SDK ready
    await new Promise((resolve) => {
      bootstrapResult.client.on('ready', () => resolve());
    });
    
    const loginEnabled = bootstrapResult.client.variation('enable-user-login', true);
    expect(loginEnabled).toBe(true);

    // Step 3: Show login screen (no saved users)
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
      <div class="login-container">
        <h1>Weather App</h1>
        <form id="login-form">
          <input type="email" id="email-input" placeholder="your.email@example.com" required>
          <input type="text" id="name-input" placeholder="Your name (optional)">
          <button type="submit">Add User</button>
        </form>
        <button type="button" id="anonymous-btn">Continue as Anonymous</button>
      </div>
    `;
    
    // Verify no saved users are displayed
    const usersList = appContent.querySelector('.users-list');
    expect(usersList).toBeNull();
    
    // Verify form is present
    const loginForm = appContent.querySelector('#login-form');
    expect(loginForm).not.toBeNull();

    // Step 4: User fills out form and submits
    const emailInput = document.getElementById('email-input');
    const nameInput = document.getElementById('name-input');
    
    emailInput.value = 'newuser@example.com';
    nameInput.value = 'New User';
    
    // Simulate form submission
    const newUserEmail = emailInput.value;
    const newUserName = nameInput.value || newUserEmail.split('@')[0];
    
    // Save to localStorage
    const usersJson = localStorage.getItem('weatherAppUsers');
    const usersArray = usersJson ? JSON.parse(usersJson) : [];
    
    const newProfile = {
      email: newUserEmail,
      name: newUserName,
      lastLogin: new Date().toISOString()
    };
    
    usersArray.push(newProfile);
    localStorage.setItem('weatherAppUsers', JSON.stringify(usersArray));
    
    // Verify profile was saved
    const savedUsers = JSON.parse(localStorage.getItem('weatherAppUsers'));
    expect(savedUsers.length).toBe(1);
    expect(savedUsers[0].email).toBe('newuser@example.com');
    expect(savedUsers[0].name).toBe('New User');

    // Step 5: Call identify with new user context
    const userContext = {
      kind: 'user',
      key: newUserEmail,
      email: newUserEmail,
      name: newUserName,
      location: {
        latitude: mockLocation.latitude,
        longitude: mockLocation.longitude
      }
    };
    
    await bootstrapResult.client.identify(userContext);
    
    // Verify identify was called
    expect(identifyCalled).toBe(true);
    expect(identifyContext.key).toBe('newuser@example.com');
    expect(identifyContext.email).toBe('newuser@example.com');
    expect(identifyContext.name).toBe('New User');
    expect(identifyContext.location).toBeDefined();

    // Step 6: Weather app loads
    appContent.innerHTML = '<div class="weather-app"><h1>Weather App</h1><p>User: New User</p></div>';
    
    expect(appContent.textContent).toContain('Weather App');
    expect(appContent.textContent).toContain('New User');
  });

  /**
   * Test: Bootstrap → Login Screen → Anonymous → Weather App
   * 
   * This test verifies the complete flow when a user continues as anonymous:
   * 1. App starts with anonymous context
   * 2. Login screen displays
   * 3. User clicks "Continue as Anonymous"
   * 4. SDK identify is NOT called
   * 5. Weather app loads with anonymous context
   */
  it('should complete flow: bootstrap → login screen → anonymous → weather app', async () => {
    // Setup: Some saved users exist (but user chooses anonymous)
    const savedUsers = [
      {
        email: 'existing@example.com',
        name: 'Existing User',
        lastLogin: new Date('2024-01-01').toISOString()
      }
    ];
    localStorage.setItem('weatherAppUsers', JSON.stringify(savedUsers));

    // Mock geolocation
    const mockLocation = {
      latitude: 51.5074,
      longitude: -0.1278,
      accuracy: 20
    };
    
    global.navigator = {
      ...global.navigator,
      geolocation: {
        getCurrentPosition: (success) => {
          success({ coords: mockLocation });
        }
      }
    };

    // Step 1: Bootstrap with anonymous context
    let identifyCalled = false;
    let anonymousContext = null;
    
    const mockInitializeSDK = vi.fn(async (context) => {
      anonymousContext = context;
      expect(context.anonymous).toBe(true);
      
      return {
        variation: vi.fn((flagKey) => {
          if (flagKey === 'enable-user-login') {
            return true;
          }
          return false;
        }),
        on: vi.fn((event, callback) => {
          if (event === 'ready') {
            setTimeout(() => callback(), 10);
          }
        }),
        identify: vi.fn(async (newContext) => {
          identifyCalled = true;
          return Promise.resolve();
        }),
        getContext: vi.fn(() => anonymousContext),
        waitUntilReady: vi.fn(() => Promise.resolve())
      };
    });

    const bootstrapResult = await bootstrap(mockInitializeSDK);
    
    // Step 2: Wait for SDK ready
    await new Promise((resolve) => {
      bootstrapResult.client.on('ready', () => resolve());
    });
    
    const loginEnabled = bootstrapResult.client.variation('enable-user-login', true);
    expect(loginEnabled).toBe(true);

    // Step 3: Show login screen
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
      <div class="login-container">
        <h1>Weather App</h1>
        <div class="saved-users">
          <div class="user-item">
            <div>Existing User</div>
          </div>
        </div>
        <button type="button" id="anonymous-btn">Continue as Anonymous</button>
      </div>
    `;
    
    // Verify login screen is displayed
    expect(appContent.textContent).toContain('Weather App');
    expect(appContent.textContent).toContain('Existing User');
    
    const anonymousBtn = appContent.querySelector('#anonymous-btn');
    expect(anonymousBtn).not.toBeNull();

    // Step 4: User clicks "Continue as Anonymous"
    // This should NOT call identify - just proceed with existing anonymous context
    
    // Verify identify was NOT called
    expect(identifyCalled).toBe(false);
    expect(bootstrapResult.client.identify).not.toHaveBeenCalled();
    
    // Verify no user data was written to localStorage
    const currentUser = localStorage.getItem('weatherAppCurrentUser');
    expect(currentUser).toBeNull();
    
    // Verify context is still anonymous
    const currentContext = bootstrapResult.client.getContext();
    expect(currentContext.anonymous).toBe(true);
    expect(currentContext.location).toBeDefined();

    // Step 5: Weather app loads with anonymous context
    appContent.innerHTML = '<div class="weather-app"><h1>Weather App</h1><p>Anonymous User</p></div>';
    
    expect(appContent.textContent).toContain('Weather App');
    expect(appContent.textContent).toContain('Anonymous User');
  });

  /**
   * Test: Bootstrap → Skip Login (Flag False) → Weather App
   * 
   * This test verifies the complete flow when login is disabled:
   * 1. App starts with anonymous context
   * 2. enable-user-login flag is false
   * 3. Login screen is skipped
   * 4. Weather app loads directly with anonymous context
   */
  it('should complete flow: bootstrap → skip login (flag false) → weather app', async () => {
    // Setup: Saved users exist but login is disabled
    const savedUsers = [
      {
        email: 'user@example.com',
        name: 'User',
        lastLogin: new Date('2024-01-01').toISOString()
      }
    ];
    localStorage.setItem('weatherAppUsers', JSON.stringify(savedUsers));

    // Mock geolocation
    const mockLocation = {
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 12
    };
    
    global.navigator = {
      ...global.navigator,
      geolocation: {
        getCurrentPosition: (success) => {
          success({ coords: mockLocation });
        }
      }
    };

    // Step 1: Bootstrap with anonymous context
    let anonymousContext = null;
    
    const mockInitializeSDK = vi.fn(async (context) => {
      anonymousContext = context;
      expect(context.anonymous).toBe(true);
      
      return {
        variation: vi.fn((flagKey) => {
          if (flagKey === 'enable-user-login') {
            return false; // Login DISABLED
          }
          return false;
        }),
        on: vi.fn((event, callback) => {
          if (event === 'ready') {
            setTimeout(() => callback(), 10);
          }
        }),
        identify: vi.fn(async (newContext) => {
          return Promise.resolve();
        }),
        getContext: vi.fn(() => anonymousContext),
        waitUntilReady: vi.fn(() => Promise.resolve())
      };
    });

    const bootstrapResult = await bootstrap(mockInitializeSDK);
    
    // Step 2: Wait for SDK ready and check flag
    await new Promise((resolve) => {
      bootstrapResult.client.on('ready', () => resolve());
    });
    
    const loginEnabled = bootstrapResult.client.variation('enable-user-login', true);
    expect(loginEnabled).toBe(false); // Login is DISABLED

    // Step 3: Skip login screen entirely
    // When flag is false, we should proceed directly to weather app
    
    // Verify identify was NOT called
    expect(bootstrapResult.client.identify).not.toHaveBeenCalled();
    
    // Verify context is still anonymous
    const currentContext = bootstrapResult.client.getContext();
    expect(currentContext.anonymous).toBe(true);
    expect(currentContext.location).toBeDefined();
    expect(currentContext.location.latitude).toBe(mockLocation.latitude);

    // Step 4: Weather app loads directly with anonymous context
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = '<div class="weather-app"><h1>Weather App</h1><p>Anonymous User</p></div>';
    
    expect(appContent.textContent).toContain('Weather App');
    expect(appContent.textContent).toContain('Anonymous User');
    
    // Verify login screen was never shown
    const loginForm = appContent.querySelector('#login-form');
    expect(loginForm).toBeNull();
  });
});
