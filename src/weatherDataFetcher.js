/**
 * Weather Data Fetcher Module
 * Fetches weather data for multiple locations efficiently with caching
 */

import { handleWeatherAPIError, withRetry } from './errorHandler.js';
import { log } from './logger.js';

// Weather data cache with timestamps
const weatherCache = new Map(); // locationId -> { data, fetchedAt }
const CACHE_DURATION = 60 * 1000; // 1 minute

/**
 * Get the WeatherAPI key from environment
 * @returns {string|null} API key or null if not configured
 */
function getWeatherAPIKey() {
  return import.meta.env.VITE_WEATHER_API_KEY || null;
}

/**
 * Get cached weather data for a location if still fresh
 * @param {string} locationId - Location ID
 * @returns {Object|null} Cached weather data or null if stale/missing
 */
export function getCachedWeather(locationId) {
  const cached = weatherCache.get(locationId);
  if (cached && (Date.now() - cached.fetchedAt < CACHE_DURATION)) {
    log('[Weather Fetcher] Cache hit:', locationId);
    return cached.data;
  }
  return null;
}

/**
 * Check if cached data exists (even if stale)
 * @param {string} locationId - Location ID
 * @returns {Object|null} Cached data or null
 */
export function getStaleCache(locationId) {
  const cached = weatherCache.get(locationId);
  return cached ? cached.data : null;
}

/**
 * Fetch weather data for a single location from WeatherAPI (internal, no retry)
 * @param {Object} location - Location object with coordinates
 * @returns {Promise<Object|null>} Weather data or null on error
 */
async function fetchWeatherForLocationInternal(location) {
  const apiKey = getWeatherAPIKey();
  
  if (!apiKey) {
    warn('[Weather Fetcher] No API key configured');
    return null;
  }
  
  const { latitude, longitude } = location.coordinates;
  const query = `${latitude},${longitude}`;
  
  log('[Weather Fetcher] Fetching weather for:', location.name);
  
  const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${query}&aqi=no`;
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = new Error(`API error: ${response.status} ${response.statusText}`);
    error('[Weather Fetcher] API error:', response.status, response.statusText);
    throw error;
  }
  
  const data = await response.json();
  
  // Extract relevant weather data
  const weatherData = {
    locationId: location.id,
    temperature: data.current.temp_c,
    temperatureF: data.current.temp_f,
    condition: data.current.condition.text,
    conditionIcon: data.current.condition.icon,
    fetchedAt: new Date().toISOString(),
    isStale: false
  };
  
  // Cache the data
  weatherCache.set(location.id, {
    data: weatherData,
    fetchedAt: Date.now()
  });
  
  log('[Weather Fetcher] Weather fetched successfully:', location.name);
  return weatherData;
}

/**
 * Fetch weather data for a single location from WeatherAPI with retry
 * @param {Object} location - Location object with coordinates
 * @param {boolean} enableRetry - Whether to enable retry logic (default: true)
 * @returns {Promise<Object|null>} Weather data or null on error
 */
export async function fetchWeatherForLocation(location, enableRetry = true) {
  try {
    if (enableRetry) {
      // Use retry wrapper with 2 retries, 1 second delay
      const fetchWithRetry = withRetry(fetchWeatherForLocationInternal, 2, 1000);
      return await fetchWithRetry(location);
    } else {
      return await fetchWeatherForLocationInternal(location);
    }
  } catch (error) {
    handleWeatherAPIError(error, location.name);
    return null;
  }
}

/**
 * Fetch weather data for multiple locations in parallel
 * @param {Array<Object>} locations - Array of location objects
 * @returns {Promise<Map<string, Object>>} Map of locationId to weather data
 */
export async function fetchWeatherForLocations(locations) {
  log('[Weather Fetcher] Batch fetch for', locations.length, 'locations');
  
  // Create fetch promises for all locations
  const promises = locations.map(loc => fetchWeatherForLocation(loc));
  
  // Use Promise.allSettled to handle partial failures
  const results = await Promise.allSettled(promises);
  
  // Build result map
  const weatherMap = new Map();
  
  results.forEach((result, index) => {
    const location = locations[index];
    
    if (result.status === 'fulfilled' && result.value) {
      // Successful fetch
      weatherMap.set(location.id, result.value);
    } else {
      // Failed fetch - try to use stale cache
      const staleData = getStaleCache(location.id);
      
      if (staleData) {
        warn('[Weather Fetcher] Using stale cache for:', location.name);
        weatherMap.set(location.id, {
          ...staleData,
          isStale: true
        });
      } else {
        error('[Weather Fetcher] No data available for:', location.name);
        // Set null to indicate failure with no fallback
        weatherMap.set(location.id, null);
      }
    }
  });
  
  log('[Weather Fetcher] Batch fetch complete:', weatherMap.size, 'results');
  return weatherMap;
}

/**
 * Clear the weather cache (useful for testing)
 */
export function clearWeatherCache() {
  weatherCache.clear();
  log('[Weather Fetcher] Cache cleared');
}

/**
 * Get cache statistics (useful for debugging)
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  let fresh = 0;
  let stale = 0;
  
  weatherCache.forEach((cached) => {
    if (now - cached.fetchedAt < CACHE_DURATION) {
      fresh++;
    } else {
      stale++;
    }
  });
  
  return {
    total: weatherCache.size,
    fresh,
    stale
  };
}
