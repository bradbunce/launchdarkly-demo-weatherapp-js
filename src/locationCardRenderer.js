/**
 * Location Card Renderer Module
 * Renders compact location cards for list view display
 */

import { showStalenessIndicator } from './errorHandler.js';

/**
 * Sort locations by addedAt timestamp (most recent first)
 * @param {Array<Object>} locations - Array of location objects
 * @returns {Array<Object>} Sorted array of locations
 */
export function sortLocationsByTimestamp(locations) {
  return [...locations].sort((a, b) => {
    const dateA = new Date(a.addedAt);
    const dateB = new Date(b.addedAt);
    return dateB - dateA; // Descending order (most recent first)
  });
}

/**
 * Get weather theme class based on weather condition
 * @param {string} condition - Weather condition string
 * @param {boolean} dynamicThemeEnabled - Whether dynamic weather theme flag is enabled
 * @returns {string} CSS class for weather theme
 */
function getWeatherThemeClass(condition, dynamicThemeEnabled) {
  if (!dynamicThemeEnabled) {
    return 'theme-standard';
  }
  
  const conditionLower = (condition || '').toLowerCase();
  
  if (conditionLower.includes('sunny') || conditionLower.includes('clear')) {
    return 'theme-sunny';
  } else if (conditionLower.includes('cloud')) {
    return 'theme-cloudy';
  } else if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
    return 'theme-rainy';
  } else if (conditionLower.includes('snow')) {
    return 'theme-snowy';
  } else if (conditionLower.includes('storm') || conditionLower.includes('thunder')) {
    return 'theme-stormy';
  } else if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
    return 'theme-foggy';
  }
  
  return 'theme-standard';
}

/**
 * Format temperature based on temperature scale flag
 * @param {number} temperature - Temperature value
 * @param {boolean} useFahrenheit - Whether to use Fahrenheit (true) or Celsius (false)
 * @returns {string} Formatted temperature string
 */
function formatTemperature(temperature, useFahrenheit) {
  const unit = useFahrenheit ? '°F' : '°C';
  return `${Math.round(temperature)}${unit}`;
}

/**
 * Render a single location card with weather data
 * @param {Object} location - Location object
 * @param {Object} weatherData - Weather data for the location
 * @param {Object} options - Rendering options
 * @param {boolean} options.useFahrenheit - Temperature scale flag
 * @param {boolean} options.dynamicThemeEnabled - Dynamic weather theme flag
 * @param {boolean} options.canSaveLocations - Whether save-locations flag is enabled
 * @returns {HTMLElement} Card DOM element
 */
export function renderLocationCard(location, weatherData, options = {}) {
  const { useFahrenheit = true, dynamicThemeEnabled = false, canSaveLocations = true } = options;
  
  // Create card container
  const card = document.createElement('div');
  card.className = 'location-card';
  card.dataset.locationId = location.id;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `View weather for ${location.name}`);
  
  // Apply weather theme
  const themeClass = getWeatherThemeClass(weatherData?.condition, dynamicThemeEnabled);
  card.classList.add(themeClass);
  
  // Create card content
  const content = document.createElement('div');
  content.className = 'location-card-content';
  
  // Location name
  const nameElement = document.createElement('h3');
  nameElement.className = 'location-name';
  nameElement.textContent = location.name;
  content.appendChild(nameElement);
  
  // Weather info container
  const weatherInfo = document.createElement('div');
  weatherInfo.className = 'weather-info';
  
  // Temperature
  if (weatherData && typeof weatherData.temperature === 'number') {
    const tempElement = document.createElement('div');
    tempElement.className = 'temperature';
    tempElement.textContent = formatTemperature(weatherData.temperature, useFahrenheit);
    weatherInfo.appendChild(tempElement);
  }
  
  // Weather condition with icon
  if (weatherData && weatherData.condition) {
    const conditionElement = document.createElement('div');
    conditionElement.className = 'condition';
    
    // Add icon if available
    if (weatherData.conditionIcon) {
      const icon = document.createElement('img');
      icon.className = 'condition-icon';
      icon.src = weatherData.conditionIcon;
      icon.alt = weatherData.condition;
      conditionElement.appendChild(icon);
    }
    
    const conditionText = document.createElement('span');
    conditionText.textContent = weatherData.condition;
    conditionElement.appendChild(conditionText);
    
    weatherInfo.appendChild(conditionElement);
  }
  
  content.appendChild(weatherInfo);
  card.appendChild(content);
  
  // Show staleness indicator if data is stale
  if (weatherData && weatherData.isStale && weatherData.fetchedAt) {
    showStalenessIndicator(card, weatherData.fetchedAt);
  }
  
  // Only show action buttons if save-locations flag is enabled
  if (canSaveLocations) {
    // Create action buttons container
    const actions = document.createElement('div');
    actions.className = 'location-card-actions';
    
    // Edit button
    const editButton = document.createElement('button');
    editButton.className = 'edit-button';
    editButton.textContent = 'Edit';
    editButton.setAttribute('aria-label', `Edit ${location.name}`);
    editButton.dataset.locationId = location.id;
    editButton.dataset.action = 'edit';
    actions.appendChild(editButton);
    
    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', `Delete ${location.name}`);
    deleteButton.dataset.locationId = location.id;
    deleteButton.dataset.action = 'delete';
    actions.appendChild(deleteButton);
    
    card.appendChild(actions);
  }
  
  return card;
}

/**
 * Update an existing location card with new weather data
 * @param {HTMLElement} cardElement - Existing card DOM element
 * @param {Object} newWeatherData - New weather data
 * @param {Object} options - Rendering options
 * @param {boolean} options.useFahrenheit - Temperature scale flag
 * @param {boolean} options.dynamicThemeEnabled - Dynamic weather theme flag
 */
export function updateLocationCard(cardElement, newWeatherData, options = {}) {
  const { useFahrenheit = true, dynamicThemeEnabled = false } = options;
  
  // Update weather theme
  const oldThemeClasses = Array.from(cardElement.classList).filter(c => c.startsWith('theme-'));
  oldThemeClasses.forEach(c => cardElement.classList.remove(c));
  
  const themeClass = getWeatherThemeClass(newWeatherData?.condition, dynamicThemeEnabled);
  cardElement.classList.add(themeClass);
  
  // Update temperature
  const tempElement = cardElement.querySelector('.temperature');
  if (tempElement && newWeatherData && typeof newWeatherData.temperature === 'number') {
    tempElement.textContent = formatTemperature(newWeatherData.temperature, useFahrenheit);
  }
  
  // Update condition
  const conditionElement = cardElement.querySelector('.condition');
  if (conditionElement && newWeatherData && newWeatherData.condition) {
    // Update icon if present
    const icon = conditionElement.querySelector('.condition-icon');
    if (icon && newWeatherData.conditionIcon) {
      icon.src = newWeatherData.conditionIcon;
      icon.alt = newWeatherData.condition;
    }
    
    // Update condition text
    const conditionText = conditionElement.querySelector('span');
    if (conditionText) {
      conditionText.textContent = newWeatherData.condition;
    }
  }
}

/**
 * Render all location cards in a container
 * @param {Array<Object>} locations - Array of location objects
 * @param {Map<string, Object>} weatherDataMap - Map of locationId to weather data
 * @param {HTMLElement} container - Container element to render cards into
 * @param {Object} options - Rendering options
 * @param {boolean} options.useFahrenheit - Temperature scale flag
 * @param {boolean} options.dynamicThemeEnabled - Dynamic weather theme flag
 */
export function renderLocationCards(locations, weatherDataMap, container, options = {}) {
  // Clear container
  container.innerHTML = '';
  
  // Sort locations by timestamp (most recent first)
  const sortedLocations = sortLocationsByTimestamp(locations);
  
  // Render each card
  sortedLocations.forEach(location => {
    const weatherData = weatherDataMap.get(location.id);
    const card = renderLocationCard(location, weatherData, options);
    container.appendChild(card);
  });
}

/**
 * Attach event handlers to location cards using event delegation
 * @param {HTMLElement} container - Container element with location cards
 * @param {Object} handlers - Event handler functions
 * @param {Function} handlers.onCardClick - Handler for card click (receives locationId)
 * @param {Function} handlers.onEdit - Handler for edit button click (receives locationId)
 * @param {Function} handlers.onDelete - Handler for delete button click (receives locationId)
 */
export function attachCardEventHandlers(container, handlers) {
  const { onCardClick, onEdit, onDelete } = handlers;
  
  // Use event delegation for efficient event handling
  container.addEventListener('click', (event) => {
    const target = event.target;
    
    // Check if edit button was clicked
    if (target.classList.contains('edit-button') || target.closest('.edit-button')) {
      event.stopPropagation();
      const button = target.classList.contains('edit-button') ? target : target.closest('.edit-button');
      const locationId = button.dataset.locationId;
      if (onEdit && locationId) {
        onEdit(locationId);
      }
      return;
    }
    
    // Check if delete button was clicked
    if (target.classList.contains('delete-button') || target.closest('.delete-button')) {
      event.stopPropagation();
      const button = target.classList.contains('delete-button') ? target : target.closest('.delete-button');
      const locationId = button.dataset.locationId;
      if (onDelete && locationId) {
        onDelete(locationId);
      }
      return;
    }
    
    // Check if card itself was clicked (but not action buttons)
    const card = target.closest('.location-card');
    if (card && !target.closest('.location-card-actions')) {
      const locationId = card.dataset.locationId;
      if (onCardClick && locationId) {
        onCardClick(locationId);
      }
    }
  });
  
  // Add keyboard navigation support
  container.addEventListener('keydown', (event) => {
    const target = event.target;
    
    // Handle Enter and Space keys for card activation
    if (event.key === 'Enter' || event.key === ' ') {
      // Check if edit button has focus
      if (target.classList.contains('edit-button') || target.closest('.edit-button')) {
        event.preventDefault();
        const button = target.classList.contains('edit-button') ? target : target.closest('.edit-button');
        const locationId = button.dataset.locationId;
        if (onEdit && locationId) {
          onEdit(locationId);
        }
        return;
      }
      
      // Check if delete button has focus
      if (target.classList.contains('delete-button') || target.closest('.delete-button')) {
        event.preventDefault();
        const button = target.classList.contains('delete-button') ? target : target.closest('.delete-button');
        const locationId = button.dataset.locationId;
        if (onDelete && locationId) {
          onDelete(locationId);
        }
        return;
      }
      
      // Check if card itself has focus
      const card = target.closest('.location-card');
      if (card && card === target) {
        event.preventDefault();
        const locationId = card.dataset.locationId;
        if (onCardClick && locationId) {
          onCardClick(locationId);
        }
      }
    }
  });
}
