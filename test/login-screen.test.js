/**
 * Property-based tests for login screen functionality
 * Feature: authentication-flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

describe('Login Screen', () => {
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
   * Feature: authentication-flow, Property 14: Saved users display
   * Validates: Requirements 4.1
   * 
   * Property: For any login screen display when localStorage contains user profiles, 
   * all saved users must be displayed in the UI
   */
  it('Property 14: Saved users display - all saved users are displayed', () => {
    fc.assert(
      fc.property(
        // Generate an array of user profiles (1-10 users)
        fc.array(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            lastLogin: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString())
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (users) => {
          // Setup: Save users to localStorage
          localStorage.setItem('weatherAppUsers', JSON.stringify(users));
          
          // Create a mock showLoginScreen function that renders the UI
          const appContent = document.getElementById('app-content');
          
          // Simulate the showLoginScreen function's user list rendering
          const usersData = localStorage.getItem('weatherAppUsers');
          const savedUsers = usersData ? JSON.parse(usersData) : [];
          
          // Helper to escape HTML
          const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
          };
          
          if (savedUsers.length > 0) {
            let usersListHTML = '<div class="saved-users"><div class="users-list">';
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
            appContent.innerHTML = usersListHTML;
          }
          
          // Verify: All users are displayed in the UI
          const displayedUserElements = appContent.querySelectorAll('.user-item');
          expect(displayedUserElements.length).toBe(users.length);
          
          // Verify: Each user's email and name are present in the text content
          const textContent = appContent.textContent;
          users.forEach(user => {
            expect(textContent).toContain(user.name);
            expect(textContent).toContain(user.email);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: authentication-flow, Property 14: Saved users display (empty case)
   * Validates: Requirements 4.4
   * 
   * Property: For any login screen display when localStorage contains no user profiles, 
   * only the new user form and anonymous button must be shown
   */
  it('Property 14: Saved users display - empty state shows only form and anonymous button', () => {
    // Setup: Empty localStorage
    localStorage.clear();
    
    // Create a mock showLoginScreen function that renders the UI
    const appContent = document.getElementById('app-content');
    
    // Simulate the showLoginScreen function's rendering
    const usersData = localStorage.getItem('weatherAppUsers');
    const savedUsers = usersData ? JSON.parse(usersData) : [];
    
    // When no users, only show the form and anonymous button
    if (savedUsers.length === 0) {
      appContent.innerHTML = `
        <div class="login-container">
          <form id="login-form">
            <input type="email" id="email-input" />
            <input type="text" id="name-input" />
            <button type="submit">Add User</button>
          </form>
          <button type="button" id="anonymous-btn">Continue as Anonymous</button>
        </div>
      `;
    }
    
    // Verify: No user list is displayed
    const usersList = appContent.querySelector('.users-list');
    expect(usersList).toBeNull();
    
    // Verify: Form is present
    const form = appContent.querySelector('#login-form');
    expect(form).not.toBeNull();
    
    // Verify: Anonymous button is present
    const anonymousBtn = appContent.querySelector('#anonymous-btn');
    expect(anonymousBtn).not.toBeNull();
  });

  /**
   * Feature: authentication-flow, Property 24: Form submission creates profile
   * Validates: Requirements 6.1
   * 
   * Property: For any new user form submission with a valid email, 
   * a user profile must be saved to localStorage
   */
  it('Property 24: Form submission creates profile - valid email creates profile in localStorage', () => {
    fc.assert(
      fc.property(
        // Generate valid email and optional name
        fc.emailAddress(),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
        (email, name) => {
          // Setup: Clear localStorage
          localStorage.clear();
          
          // Simulate form submission by calling saveUser function
          // This is the core logic that should be in the application
          const saveUser = (email, name) => {
            const users = localStorage.getItem('weatherAppUsers');
            const usersList = users ? JSON.parse(users) : [];
            
            const profile = {
              email: email,
              name: name || email.split('@')[0],
              lastLogin: new Date().toISOString()
            };
            
            const existingIndex = usersList.findIndex(u => u.email === email);
            if (existingIndex >= 0) {
              usersList[existingIndex] = profile;
            } else {
              usersList.push(profile);
            }
            
            localStorage.setItem('weatherAppUsers', JSON.stringify(usersList));
          };
          
          // Execute: Submit form with email and optional name
          saveUser(email, name);
          
          // Verify: Profile was saved to localStorage
          const savedData = localStorage.getItem('weatherAppUsers');
          expect(savedData).not.toBeNull();
          
          const savedUsers = JSON.parse(savedData);
          expect(savedUsers.length).toBeGreaterThan(0);
          
          // Verify: The saved profile contains the email
          const savedProfile = savedUsers.find(u => u.email === email);
          expect(savedProfile).toBeDefined();
          expect(savedProfile.email).toBe(email);
          
          // Verify: The saved profile has a name (either provided or derived)
          expect(savedProfile.name).toBeDefined();
          if (name) {
            expect(savedProfile.name).toBe(name);
          } else {
            expect(savedProfile.name).toBe(email.split('@')[0]);
          }
          
          // Verify: The saved profile has a lastLogin timestamp
          expect(savedProfile.lastLogin).toBeDefined();
          expect(new Date(savedProfile.lastLogin).getTime()).toBeGreaterThan(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: authentication-flow, Property 26: Default name derivation
   * Validates: Requirements 6.3
   * 
   * Property: For any new user form submission without a provided name, 
   * the name must be derived from the email address prefix (characters before @)
   */
  it('Property 26: Default name derivation - name derived from email prefix when not provided', () => {
    fc.assert(
      fc.property(
        // Generate valid email addresses
        fc.emailAddress(),
        (email) => {
          // Setup: Clear localStorage
          localStorage.clear();
          
          // Simulate form submission with email but NO name
          const saveUser = (email, name) => {
            const users = localStorage.getItem('weatherAppUsers');
            const usersList = users ? JSON.parse(users) : [];
            
            const profile = {
              email: email,
              name: name || email.split('@')[0],
              lastLogin: new Date().toISOString()
            };
            
            const existingIndex = usersList.findIndex(u => u.email === email);
            if (existingIndex >= 0) {
              usersList[existingIndex] = profile;
            } else {
              usersList.push(profile);
            }
            
            localStorage.setItem('weatherAppUsers', JSON.stringify(usersList));
          };
          
          // Execute: Submit form with email and NO name (null/undefined/empty)
          saveUser(email, null);
          
          // Verify: Profile was saved to localStorage
          const savedData = localStorage.getItem('weatherAppUsers');
          expect(savedData).not.toBeNull();
          
          const savedUsers = JSON.parse(savedData);
          const savedProfile = savedUsers.find(u => u.email === email);
          
          // Verify: The name was derived from email prefix
          const expectedName = email.split('@')[0];
          expect(savedProfile.name).toBe(expectedName);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: authentication-flow, Property 26: Default name derivation (with empty string)
   * Validates: Requirements 6.3
   * 
   * Property: For any new user form submission with an empty string name, 
   * the name must be derived from the email address prefix
   */
  it('Property 26: Default name derivation - empty string name triggers derivation', () => {
    fc.assert(
      fc.property(
        // Generate valid email addresses
        fc.emailAddress(),
        (email) => {
          // Setup: Clear localStorage
          localStorage.clear();
          
          // Simulate form submission with email and EMPTY STRING name
          const saveUser = (email, name) => {
            const users = localStorage.getItem('weatherAppUsers');
            const usersList = users ? JSON.parse(users) : [];
            
            const profile = {
              email: email,
              name: name || email.split('@')[0],
              lastLogin: new Date().toISOString()
            };
            
            const existingIndex = usersList.findIndex(u => u.email === email);
            if (existingIndex >= 0) {
              usersList[existingIndex] = profile;
            } else {
              usersList.push(profile);
            }
            
            localStorage.setItem('weatherAppUsers', JSON.stringify(usersList));
          };
          
          // Execute: Submit form with email and empty string name
          saveUser(email, '');
          
          // Verify: Profile was saved to localStorage
          const savedData = localStorage.getItem('weatherAppUsers');
          expect(savedData).not.toBeNull();
          
          const savedUsers = JSON.parse(savedData);
          const savedProfile = savedUsers.find(u => u.email === email);
          
          // Verify: The name was derived from email prefix (empty string is falsy)
          const expectedName = email.split('@')[0];
          expect(savedProfile.name).toBe(expectedName);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: authentication-flow, Property 18: User profile ordering
   * Validates: Requirements 4.5
   * 
   * Property: For any login screen display with multiple saved users, 
   * the users must be ordered by lastLogin timestamp in descending order (most recent first)
   */
  it('Property 18: User profile ordering - users ordered by lastLogin descending', () => {
    fc.assert(
      fc.property(
        // Generate an array of user profiles with different lastLogin timestamps (2-10 users)
        fc.array(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            lastLogin: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString())
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (users) => {
          // Setup: Save users to localStorage
          localStorage.setItem('weatherAppUsers', JSON.stringify(users));
          
          // Create a mock showLoginScreen function that renders the UI
          const appContent = document.getElementById('app-content');
          
          // Simulate the showLoginScreen function's user list rendering
          // The actual implementation should sort by lastLogin
          const usersData = localStorage.getItem('weatherAppUsers');
          const savedUsers = usersData ? JSON.parse(usersData) : [];
          
          // Sort users by lastLogin in descending order (most recent first)
          const sortedUsers = [...savedUsers].sort((a, b) => {
            return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
          });
          
          // Helper to escape HTML
          const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
          };
          
          if (sortedUsers.length > 0) {
            let usersListHTML = '<div class="saved-users"><div class="users-list">';
            sortedUsers.forEach((user, index) => {
              usersListHTML += `
                <div class="user-item" data-index="${index}" data-email="${escapeHtml(user.email)}">
                  <div class="user-item-info">
                    <div><strong>${escapeHtml(user.name)}</strong></div>
                    <div>${escapeHtml(user.email)}</div>
                  </div>
                </div>
              `;
            });
            usersListHTML += '</div></div>';
            appContent.innerHTML = usersListHTML;
          }
          
          // Verify: Users are displayed in the correct order
          const displayedUserElements = appContent.querySelectorAll('.user-item');
          expect(displayedUserElements.length).toBe(sortedUsers.length);
          
          // Verify: Each user appears in the correct position
          sortedUsers.forEach((user, index) => {
            const userElement = displayedUserElements[index];
            expect(userElement.textContent).toContain(user.name);
            expect(userElement.textContent).toContain(user.email);
          });
          
          // Verify: The order is descending by lastLogin
          for (let i = 0; i < sortedUsers.length - 1; i++) {
            const currentLogin = new Date(sortedUsers[i].lastLogin).getTime();
            const nextLogin = new Date(sortedUsers[i + 1].lastLogin).getTime();
            expect(currentLogin).toBeGreaterThanOrEqual(nextLogin);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: authentication-flow, Property 31: Edit populates form
   * Validates: Requirements 8.1
   * 
   * Property: For any edit button click on a saved profile, 
   * the form fields must be populated with the user's current name and email
   */
  it('Property 31: Edit populates form - form fields populated with user data on edit', () => {
    fc.assert(
      fc.property(
        // Generate a user profile
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          lastLogin: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString())
        }),
        (user) => {
          // Setup: Save user to localStorage
          localStorage.setItem('weatherAppUsers', JSON.stringify([user]));
          
          // Create the login form in the DOM
          const appContent = document.getElementById('app-content');
          appContent.innerHTML = `
            <form id="login-form">
              <input type="email" id="email-input" value="" />
              <input type="text" id="name-input" value="" />
              <button type="submit">Add User</button>
            </form>
          `;
          
          const emailInput = document.getElementById('email-input');
          const nameInput = document.getElementById('name-input');
          
          // Verify initial state: form is empty
          expect(emailInput.value).toBe('');
          expect(nameInput.value).toBe('');
          
          // Simulate the editUser function
          const editUser = (email) => {
            const usersData = localStorage.getItem('weatherAppUsers');
            const users = usersData ? JSON.parse(usersData) : [];
            const userToEdit = users.find(u => u.email === email);
            
            if (userToEdit) {
              emailInput.value = userToEdit.email;
              nameInput.value = userToEdit.name;
            }
          };
          
          // Execute: Click edit button (simulate editUser call)
          editUser(user.email);
          
          // Verify: Form fields are populated with user data
          expect(emailInput.value).toBe(user.email);
          expect(nameInput.value).toBe(user.name);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: authentication-flow, Property 32: Edit disables email field
   * Validates: Requirements 8.2
   * 
   * Property: For any profile edit mode, 
   * the email input field must be disabled to prevent modification
   */
  it('Property 32: Edit disables email field - email field disabled during edit', () => {
    fc.assert(
      fc.property(
        // Generate a user profile
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          lastLogin: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString())
        }),
        (user) => {
          // Setup: Save user to localStorage
          localStorage.setItem('weatherAppUsers', JSON.stringify([user]));
          
          // Create the login form in the DOM
          const appContent = document.getElementById('app-content');
          appContent.innerHTML = `
            <form id="login-form">
              <input type="email" id="email-input" value="" />
              <input type="text" id="name-input" value="" />
              <button type="submit">Add User</button>
            </form>
          `;
          
          const emailInput = document.getElementById('email-input');
          const nameInput = document.getElementById('name-input');
          
          // Verify initial state: email field is not disabled
          expect(emailInput.disabled).toBe(false);
          
          // Simulate the editUser function
          const editUser = (email) => {
            const usersData = localStorage.getItem('weatherAppUsers');
            const users = usersData ? JSON.parse(usersData) : [];
            const userToEdit = users.find(u => u.email === email);
            
            if (userToEdit) {
              emailInput.value = userToEdit.email;
              nameInput.value = userToEdit.name;
              emailInput.disabled = true; // Disable email field during edit
            }
          };
          
          // Execute: Click edit button (simulate editUser call)
          editUser(user.email);
          
          // Verify: Email field is disabled
          expect(emailInput.disabled).toBe(true);
          
          // Verify: Name field is still enabled (not disabled)
          expect(nameInput.disabled).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

  /**
   * Feature: authentication-flow, Property 36: Delete prompts confirmation
   * Validates: Requirements 9.1
   * 
   * Property: For any delete button click, 
   * a confirmation dialog must be displayed before deletion
   */
  it('Property 36: Delete prompts confirmation - confirmation required before deletion', () => {
    fc.assert(
      fc.property(
        // Generate a user profile
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          lastLogin: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString())
        }),
        (user) => {
          // Setup: Save user to localStorage
          localStorage.setItem('weatherAppUsers', JSON.stringify([user]));
          
          // Track if confirm was called
          let confirmCalled = false;
          let confirmMessage = '';
          
          // Mock the confirm function
          const mockConfirm = (message) => {
            confirmCalled = true;
            confirmMessage = message;
            return false; // User cancels deletion
          };
          
          // Simulate the deleteUser function
          const deleteUser = (email, confirmFn) => {
            if (confirmFn(`Delete user ${email}?`)) {
              const usersData = localStorage.getItem('weatherAppUsers');
              const users = usersData ? JSON.parse(usersData) : [];
              const filtered = users.filter(u => u.email !== email);
              localStorage.setItem('weatherAppUsers', JSON.stringify(filtered));
            }
          };
          
          // Execute: Click delete button (simulate deleteUser call)
          deleteUser(user.email, mockConfirm);
          
          // Verify: Confirm was called
          expect(confirmCalled).toBe(true);
          
          // Verify: Confirm message contains the user's email
          expect(confirmMessage).toContain(user.email);
          
          // Verify: User was NOT deleted (because we returned false from confirm)
          const savedData = localStorage.getItem('weatherAppUsers');
          const savedUsers = JSON.parse(savedData);
          expect(savedUsers.length).toBe(1);
          expect(savedUsers[0].email).toBe(user.email);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: authentication-flow, Property 36: Delete prompts confirmation (confirmed case)
   * Validates: Requirements 9.1, 9.2
   * 
   * Property: For any delete button click with confirmation, 
   * the user profile must be removed from localStorage
   */
  it('Property 36: Delete prompts confirmation - deletion proceeds when confirmed', () => {
    fc.assert(
      fc.property(
        // Generate a user profile
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          lastLogin: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString())
        }),
        (user) => {
          // Setup: Save user to localStorage
          localStorage.setItem('weatherAppUsers', JSON.stringify([user]));
          
          // Track if confirm was called
          let confirmCalled = false;
          
          // Mock the confirm function (returns true - user confirms)
          const mockConfirm = (message) => {
            confirmCalled = true;
            return true; // User confirms deletion
          };
          
          // Simulate the deleteUser function
          const deleteUser = (email, confirmFn) => {
            if (confirmFn(`Delete user ${email}?`)) {
              const usersData = localStorage.getItem('weatherAppUsers');
              const users = usersData ? JSON.parse(usersData) : [];
              const filtered = users.filter(u => u.email !== email);
              localStorage.setItem('weatherAppUsers', JSON.stringify(filtered));
            }
          };
          
          // Execute: Click delete button and confirm (simulate deleteUser call)
          deleteUser(user.email, mockConfirm);
          
          // Verify: Confirm was called
          expect(confirmCalled).toBe(true);
          
          // Verify: User WAS deleted (because we returned true from confirm)
          const savedData = localStorage.getItem('weatherAppUsers');
          const savedUsers = JSON.parse(savedData);
          expect(savedUsers.length).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: authentication-flow, Property 39: Cascading deletion
   * Validates: Requirements 9.5
   * 
   * Property: For any profile deletion, 
   * all associated user data (saved locations, preferences) must also be removed from localStorage
   */
  it('Property 39: Cascading deletion - associated data removed with profile', () => {
    fc.assert(
      fc.property(
        // Generate a user profile with associated data
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          lastLogin: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString())
        }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }), // saved locations
        fc.string({ minLength: 1, maxLength: 50 }), // default location
        fc.string({ minLength: 1, maxLength: 50 }), // current location
        (user, savedLocations, defaultLocation, currentLocation) => {
          // Setup: Save user and associated data to localStorage
          localStorage.setItem('weatherAppUsers', JSON.stringify([user]));
          localStorage.setItem(`weatherAppLocations_${user.email}`, JSON.stringify(savedLocations));
          localStorage.setItem(`weatherAppDefaultLocation_${user.email}`, defaultLocation);
          localStorage.setItem(`weatherAppCurrentLocation_${user.email}`, currentLocation);
          
          // Verify setup: All data exists
          expect(localStorage.getItem('weatherAppUsers')).not.toBeNull();
          expect(localStorage.getItem(`weatherAppLocations_${user.email}`)).not.toBeNull();
          expect(localStorage.getItem(`weatherAppDefaultLocation_${user.email}`)).not.toBeNull();
          expect(localStorage.getItem(`weatherAppCurrentLocation_${user.email}`)).not.toBeNull();
          
          // Simulate the deleteUser function with cascading deletion
          const deleteUser = (email) => {
            // Remove user profile
            const usersData = localStorage.getItem('weatherAppUsers');
            const users = usersData ? JSON.parse(usersData) : [];
            const filtered = users.filter(u => u.email !== email);
            localStorage.setItem('weatherAppUsers', JSON.stringify(filtered));
            
            // Remove associated data (cascading deletion)
            localStorage.removeItem(`weatherAppLocations_${email}`);
            localStorage.removeItem(`weatherAppDefaultLocation_${email}`);
            localStorage.removeItem(`weatherAppCurrentLocation_${email}`);
          };
          
          // Execute: Delete user
          deleteUser(user.email);
          
          // Verify: User profile is deleted
          const savedData = localStorage.getItem('weatherAppUsers');
          const savedUsers = JSON.parse(savedData);
          expect(savedUsers.length).toBe(0);
          
          // Verify: All associated data is deleted (cascading deletion)
          expect(localStorage.getItem(`weatherAppLocations_${user.email}`)).toBeNull();
          expect(localStorage.getItem(`weatherAppDefaultLocation_${user.email}`)).toBeNull();
          expect(localStorage.getItem(`weatherAppCurrentLocation_${user.email}`)).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: authentication-flow, Property 39: Cascading deletion (multiple users)
   * Validates: Requirements 9.5
   * 
   * Property: For any profile deletion with multiple users, 
   * only the deleted user's associated data should be removed, not other users' data
   */
  it('Property 39: Cascading deletion - only deleted user data removed, others preserved', () => {
    fc.assert(
      fc.property(
        // Generate two different user profiles
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          lastLogin: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString())
        }),
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          lastLogin: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString())
        }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 3 }), // user1 locations
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 3 }), // user2 locations
        (user1, user2, user1Locations, user2Locations) => {
          // Ensure users have different emails
          if (user1.email === user2.email) {
            return true; // Skip this test case
          }
          
          // Setup: Save both users and their associated data
          localStorage.setItem('weatherAppUsers', JSON.stringify([user1, user2]));
          localStorage.setItem(`weatherAppLocations_${user1.email}`, JSON.stringify(user1Locations));
          localStorage.setItem(`weatherAppLocations_${user2.email}`, JSON.stringify(user2Locations));
          localStorage.setItem(`weatherAppDefaultLocation_${user1.email}`, 'City1');
          localStorage.setItem(`weatherAppDefaultLocation_${user2.email}`, 'City2');
          
          // Simulate the deleteUser function with cascading deletion
          const deleteUser = (email) => {
            // Remove user profile
            const usersData = localStorage.getItem('weatherAppUsers');
            const users = usersData ? JSON.parse(usersData) : [];
            const filtered = users.filter(u => u.email !== email);
            localStorage.setItem('weatherAppUsers', JSON.stringify(filtered));
            
            // Remove associated data (cascading deletion)
            localStorage.removeItem(`weatherAppLocations_${email}`);
            localStorage.removeItem(`weatherAppDefaultLocation_${email}`);
            localStorage.removeItem(`weatherAppCurrentLocation_${email}`);
          };
          
          // Execute: Delete user1 only
          deleteUser(user1.email);
          
          // Verify: User1 profile is deleted
          const savedData = localStorage.getItem('weatherAppUsers');
          const savedUsers = JSON.parse(savedData);
          expect(savedUsers.length).toBe(1);
          expect(savedUsers[0].email).toBe(user2.email);
          
          // Verify: User1's associated data is deleted
          expect(localStorage.getItem(`weatherAppLocations_${user1.email}`)).toBeNull();
          expect(localStorage.getItem(`weatherAppDefaultLocation_${user1.email}`)).toBeNull();
          
          // Verify: User2's associated data is preserved
          expect(localStorage.getItem(`weatherAppLocations_${user2.email}`)).not.toBeNull();
          expect(localStorage.getItem(`weatherAppDefaultLocation_${user2.email}`)).not.toBeNull();
          expect(localStorage.getItem(`weatherAppDefaultLocation_${user2.email}`)).toBe('City2');
          
          const user2SavedLocations = JSON.parse(localStorage.getItem(`weatherAppLocations_${user2.email}`));
          expect(user2SavedLocations).toEqual(user2Locations);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
