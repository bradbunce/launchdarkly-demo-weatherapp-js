/**
 * Location Storage Module
 * Manages CRUD operations for saved locations with localStorage persistence
 */

import { handleStorageQuotaError } from './errorHandler.js';

// In-memory fallback storage when localStorage is unavailable
const inMemoryStorage = new Map();

/**
 * Get storage key for a user's locations
 * @param {string} userEmail - User's email address
 * @returns {string} Storage key
 */
function getStorageKey(userEmail) {
  return `weatherAppLocations_${userEmail}`;
}

/**
 * Save data to storage (localStorage with in-memory fallback)
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Check if it's a quota exceeded error
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      handleStorageQuotaError(error);
    } else {
      console.warn('[Location Storage] localStorage unavailable, using memory:', error);
    }
    inMemoryStorage.set(key, value);
  }
}

/**
 * Get data from storage (localStorage with in-memory fallback)
 * @param {string} key - Storage key
 * @returns {*} Stored value or null
 */
function getFromStorage(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.warn('[Location Storage] localStorage unavailable, using memory:', error);
    return inMemoryStorage.get(key) || null;
  }
}

/**
 * Validate location data has all required fields
 * @param {Object} location - Location object to validate
 * @returns {{valid: boolean, errors: Array<string>}}
 */
export function validateLocation(location) {
  const errors = [];
  
  if (!location) {
    errors.push('Location object is required');
    return { valid: false, errors };
  }
  
  if (!location.name || typeof location.name !== 'string' || location.name.trim() === '') {
    errors.push('Location name is required');
  }
  
  if (!location.coordinates) {
    errors.push('Location coordinates are required');
  } else {
    if (typeof location.coordinates.latitude !== 'number' || 
        location.coordinates.latitude < -90 || 
        location.coordinates.latitude > 90) {
      errors.push('Valid latitude is required (-90 to 90)');
    }
    if (typeof location.coordinates.longitude !== 'number' || 
        location.coordinates.longitude < -180 || 
        location.coordinates.longitude > 180) {
      errors.push('Valid longitude is required (-180 to 180)');
    }
  }
  
  if (!location.query || typeof location.query !== 'string') {
    errors.push('Location query is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Normalize location name for duplicate detection
 * @param {string} name - Location name
 * @returns {string} Normalized name
 */
function normalizeName(name) {
  return name.toLowerCase().trim();
}

/**
 * Check if a location already exists for a user
 * @param {string} userEmail - User's email address
 * @param {string} locationName - Location name to check
 * @returns {boolean} True if location exists
 */
export function locationExists(userEmail, locationName) {
  const locations = getLocations(userEmail);
  const normalized = normalizeName(locationName);
  return locations.some(loc => normalizeName(loc.name) === normalized);
}

/**
 * Get all locations for a user
 * @param {string} userEmail - User's email address
 * @returns {Array<Object>} Array of location objects
 */
export function getLocations(userEmail) {
  const key = getStorageKey(userEmail);
  const data = getFromStorage(key);
  
  if (!data || !Array.isArray(data.locations)) {
    return [];
  }
  
  return data.locations;
}

/**
 * Save a new location for a user
 * @param {string} userEmail - User's email address
 * @param {Object} location - Location object to save
 * @returns {{success: boolean, error?: string, location?: Object}}
 */
export function saveLocation(userEmail, location) {
  console.log('[Location Manager] Saving location:', { userEmail, location });
  
  // Validate location data
  const validation = validateLocation(location);
  if (!validation.valid) {
    const error = `Invalid location data: ${validation.errors.join(', ')}`;
    console.error('[Location Manager] Validation failed:', error);
    return { success: false, error };
  }
  
  // Check for duplicates
  if (locationExists(userEmail, location.name)) {
    const error = 'This location is already in your favorites';
    console.warn('[Location Manager] Duplicate location:', location.name);
    return { success: false, error };
  }
  
  // Get existing locations
  const locations = getLocations(userEmail);
  
  // Create new location with timestamps
  const newLocation = {
    id: crypto.randomUUID(),
    name: location.name,
    coordinates: {
      latitude: location.coordinates.latitude,
      longitude: location.coordinates.longitude
    },
    query: location.query,
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Add to locations array
  locations.push(newLocation);
  
  // Save to storage
  const key = getStorageKey(userEmail);
  const data = {
    locations,
    version: 1
  };
  
  try {
    saveToStorage(key, data);
    console.log('[Location Manager] Location saved successfully:', newLocation);
    return { success: true, location: newLocation };
  } catch (error) {
    console.error('[Location Manager] Save failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing location for a user
 * @param {string} userEmail - User's email address
 * @param {string} locationId - ID of location to update
 * @param {Object} updates - Fields to update
 * @returns {{success: boolean, error?: string, location?: Object}}
 */
export function updateLocation(userEmail, locationId, updates) {
  const locations = getLocations(userEmail);
  const index = locations.findIndex(loc => loc.id === locationId);
  
  if (index === -1) {
    const error = 'Location not found';
    console.error('[Location Manager] Update failed:', error);
    return { success: false, error };
  }
  
  const oldLocation = { ...locations[index] };
  
  // Update location (only allow name updates, not coordinates)
  const updatedLocation = {
    ...locations[index],
    ...updates,
    id: locationId, // Preserve ID
    coordinates: locations[index].coordinates, // Preserve coordinates
    addedAt: locations[index].addedAt, // Preserve addedAt
    updatedAt: new Date().toISOString()
  };
  
  // Validate updated location
  const validation = validateLocation(updatedLocation);
  if (!validation.valid) {
    const error = `Invalid location data: ${validation.errors.join(', ')}`;
    console.error('[Location Manager] Validation failed:', error);
    return { success: false, error };
  }
  
  // Check for duplicate name (excluding current location)
  const normalized = normalizeName(updatedLocation.name);
  const duplicate = locations.some((loc, i) => 
    i !== index && normalizeName(loc.name) === normalized
  );
  
  if (duplicate) {
    const error = 'A location with this name already exists';
    console.warn('[Location Manager] Duplicate name:', updatedLocation.name);
    return { success: false, error };
  }
  
  console.log('[Location Manager] Updating location:', { 
    userEmail, 
    oldLocation, 
    newLocation: updatedLocation 
  });
  
  // Update in array
  locations[index] = updatedLocation;
  
  // Save to storage
  const key = getStorageKey(userEmail);
  const data = {
    locations,
    version: 1
  };
  
  try {
    saveToStorage(key, data);
    console.log('[Location Manager] Location updated successfully');
    return { success: true, location: updatedLocation };
  } catch (error) {
    console.error('[Location Manager] Update failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a location for a user
 * @param {string} userEmail - User's email address
 * @param {string} locationId - ID of location to delete
 * @returns {{success: boolean, error?: string}}
 */
export function deleteLocation(userEmail, locationId) {
  const locations = getLocations(userEmail);
  const index = locations.findIndex(loc => loc.id === locationId);
  
  if (index === -1) {
    const error = 'Location not found';
    console.error('[Location Manager] Delete failed:', error);
    return { success: false, error };
  }
  
  const deletedLocation = locations[index];
  console.log('[Location Manager] Deleting location:', { userEmail, locationId, location: deletedLocation });
  
  // Remove from array
  locations.splice(index, 1);
  
  // Save to storage
  const key = getStorageKey(userEmail);
  const data = {
    locations,
    version: 1
  };
  
  try {
    saveToStorage(key, data);
    console.log('[Location Manager] Location deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('[Location Manager] Delete failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load locations from storage (with logging)
 * @param {string} userEmail - User's email address
 * @returns {Array<Object>} Array of location objects
 */
export function loadLocations(userEmail) {
  const locations = getLocations(userEmail);
  console.log('[Location Manager] Loaded locations:', { 
    userEmail, 
    count: locations.length, 
    locations 
  });
  return locations;
}

/**
 * Clear in-memory storage (for testing)
 */
export function clearInMemoryStorage() {
  inMemoryStorage.clear();
}
