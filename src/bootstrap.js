/**
 * Bootstrap module for LaunchDarkly Weather App
 * Handles the initialization sequence with anonymous context
 */

// Geolocation cache
let cachedLocation = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get user's geolocation with 5-minute caching
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number} | null>}
 */
export async function getUserLocation() {
  // Check cache first
  const now = Date.now();
  if (cachedLocation && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    console.log('[Geolocation] Using cached location:', cachedLocation);
    return cachedLocation;
  }

  return new Promise((resolve) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          
          // Update cache
          cachedLocation = location;
          cacheTimestamp = Date.now();
          
          console.log('[Geolocation] Location obtained:', location);
          resolve(location);
        },
        (error) => {
          console.warn('[Geolocation] Error:', error.message);
          resolve(null);
        },
        { timeout: 5000 } // 5s timeout
      );
    } else {
      console.warn('[Geolocation] Not supported');
      resolve(null);
    }
  });
}

/**
 * Clear the geolocation cache (useful for testing)
 */
export function clearGeolocationCache() {
  cachedLocation = null;
  cacheTimestamp = null;
}

/**
 * Create an anonymous context with optional geolocation
 * @param {Object|null} location - Geolocation data
 * @returns {Object} Anonymous LaunchDarkly context
 */
export function createAnonymousContext(location = null) {
  const context = {
    kind: 'user',
    anonymous: true
  };
  
  if (location) {
    context.location = {
      latitude: location.latitude,
      longitude: location.longitude
    };
  }
  
  return context;
}

/**
 * Bootstrap the application - always starts with anonymous context
 * This function ensures:
 * 1. Geolocation is requested before SDK initialization
 * 2. SDK is initialized with anonymous context
 * 3. localStorage is NOT read until after SDK is ready
 * 4. Errors are handled gracefully and logged
 * 
 * @param {Function} initializeSDK - Function to initialize the LaunchDarkly SDK
 * @returns {Promise<{context: Object, location: Object|null, client: Object}>}
 */
export async function bootstrap(initializeSDK) {
  let location = null;
  let client = null;
  
  // Step 1: Get geolocation (before SDK initialization)
  // Geolocation errors are already handled in getUserLocation()
  try {
    location = await getUserLocation();
  } catch (error) {
    console.error('[Bootstrap] Geolocation error:', error.message);
    // Continue without location
  }
  
  // Step 2: Create anonymous context with location
  const anonymousContext = createAnonymousContext(location);
  
  console.log('[LD Context] Bootstrap: Created anonymous context:', anonymousContext);
  
  // Step 3: Initialize SDK with anonymous context
  // Note: localStorage should NOT be read before this point
  try {
    client = await initializeSDK(anonymousContext);
  } catch (error) {
    console.error('[Bootstrap] SDK initialization failed:', error.message);
    console.error('[Bootstrap] Using defaults and allowing user login');
    // Re-throw to let caller handle SDK failure
    throw error;
  }
  
  return {
    client,
    context: anonymousContext,
    location
  };
}

/**
 * Check if localStorage has been accessed
 * This is a helper for testing to ensure localStorage isolation
 */
let localStorageAccessed = false;

// Wrap localStorage methods to track access
if (typeof window !== 'undefined' && window.localStorage) {
  const originalGetItem = window.localStorage.getItem;
  const originalSetItem = window.localStorage.setItem;
  
  window.localStorage.getItem = function(...args) {
    localStorageAccessed = true;
    return originalGetItem.apply(this, args);
  };
  
  window.localStorage.setItem = function(...args) {
    localStorageAccessed = true;
    return originalSetItem.apply(this, args);
  };
}

export function resetLocalStorageTracking() {
  localStorageAccessed = false;
}

export function wasLocalStorageAccessed() {
  return localStorageAccessed;
}
