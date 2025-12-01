# LaunchDarkly Weather App - Feature Flag Showcase

A comprehensive weather application demonstrating LaunchDarkly feature flags with **14 different flags** including multi-variation flags and boolean toggles. Built with vanilla JavaScript and a modular architecture.

## 🚩 Feature Flags

### Bootstrap Flag

1. **`enable-user-login`** - Control user authentication
   - `true` - Allow users to log in with email (personalized experience)
   - `false` - Force anonymous mode only (default experience for all)
   - **Note**: This flag is checked at app startup before login screen

### Boolean Feature Flags

2. **`temperature-scale`** - Temperature unit display
   - `true` - Display in Fahrenheit (°F)
   - `false` - Display in Celsius (°C)

3. **`save-locations`** - Allow logged-in users to save favorite locations
   - `true` - Users can save multiple cities and switch between them
   - `false` - Users can only search cities (no saving)
   - **Note**: Only available for logged-in users, not anonymous

4. **`remember-location`** - Remember last searched location (logged-in users only)
   - Only affects logged-in users who have set a default/favorite location
   - `true` - Return to last searched city
   - `false` - Always start at San Francisco
   - **Anonymous users**: Always use current geolocation
   - **Logged-in users without default**: Always use current geolocation
   - **Logged-in users with default**: Use their favorite location

5. **`show-air-quality`** - Display air quality index (AQI) and pollutant data
   - Includes: US EPA AQI, PM2.5, PM10, O₃

6. **`show-astronomy`** - Display sunrise/sunset and moon data
   - Includes: Sunrise, Sunset, Moonrise, Moonset, Moon Phase

7. **`show-forecast`** - Display 3-day weather forecast
    - Shows: Daily high/low temps, conditions, precipitation

8. **`show-hourly-forecast`** - Display next 6 hours forecast
    - Shows: Hourly temperature and conditions

9. **`show-alerts`** - Display weather alerts and warnings
    - Shows: Active weather alerts for the location

10. **`dynamic-weather-theme`** - Dynamic background themes
    - `true` - Background changes based on weather conditions
    - `false` - Static ocean blue gradient

11. **`developer-mode`** - Show developer information and console logging
    - `true` - Display "Active Feature Flags" section and enable verbose console logging
    - `false` - Hide developer tools and suppress console logs (cleaner UI and console for end users)
    - **Note**: The "🐛 Record Test Error" button is always visible for observability testing
    - **Logging**: All application console.log, console.warn, and console.error calls are hidden when this flag is false

### Multi-Variation Flags (String)

12. **`wind-speed-unit`** - Wind speed measurement
   - `mph` - Miles per hour
   - `kph` - Kilometers per hour
   - `ms` - Meters per second
   - `knots` - Nautical knots

13. **`pressure-unit`** - Atmospheric pressure unit
   - `mb` - Millibars
   - `in` - Inches of mercury (inHg)
   - `kpa` - Kilopascals

14. **`precipitation-unit`** - Precipitation measurement
   - `mm` - Millimeters
   - `in` - Inches

## Features

- **Email-based user login** - No passwords, just email for personalized feature flags
- **LocalStorage persistence** - Returning users are automatically logged in
- **Real-time weather data** from WeatherAPI
- **14 feature flags** controlling different aspects of the UI
- **Automatic weather refresh** at the top of every minute (synced to device time)
- **City search** functionality with saved locations
- **Modular architecture** - Clean separation of concerns with dedicated handlers
- **Comprehensive test suite** - 20+ test files with Vitest
- **LaunchDarkly Observability** with Web Vitals tracking
- **Session Replay** for debugging
- **Docker support** for containerized deployment
- **Vite-powered** development with hot module replacement

## Prerequisites

- Node.js (v16 or higher)
- Docker (optional, for containerized deployment)
- LaunchDarkly account with client-side ID
- WeatherAPI account (free tier available at https://www.weatherapi.com/)
  - Optional: App works with mock data if no API key provided

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your credentials:

```env
VITE_LD_CLIENT_SIDE_ID=your-client-side-id-here
VITE_WEATHER_API_KEY=your-weather-api-key-here
```

### 3. Create Feature Flags in LaunchDarkly

Create these 14 flags in your LaunchDarkly project:

**Boolean Flags:**
- `enable-user-login` (controls whether users can log in with email)
- `temperature-scale` (true = Fahrenheit, false = Celsius)
- `save-locations` (allow logged-in users to save favorite cities)
- `remember-location` (remember last searched location)
- `show-air-quality`
- `show-astronomy`
- `show-forecast`
- `show-hourly-forecast`
- `show-alerts`
- `dynamic-weather-theme`
- `developer-mode` (show Active Feature Flags section)

**String Flags:**
- `wind-speed-unit` (variations: `mph`, `kph`, `ms`, `knots`)
- `pressure-unit` (variations: `mb`, `in`, `kpa`)
- `precipitation-unit` (variations: `mm`, `in`)

### 4. Run the App

**Local Development:**
```bash
npm run dev
```

**Run Tests:**
```bash
npm test
```

**Docker:**
```bash
docker-compose up --build
```

Open http://localhost:5173 in your browser!

### 5. Login and Test

1. **Enter your email** on the login screen (no password required)
2. Optionally enter your name for personalization
3. Your email becomes your **user context key** in LaunchDarkly
4. Try different cities using the search box
5. **Target flags to yourself**: In LaunchDarkly, create targeting rules using your email
6. Toggle flags and watch the page update in real-time
7. **Logout** using the logout button in the top-right
8. **Return visit**: Your browser remembers you via localStorage

## How It Works

1. **User Login**: User enters their email address (no password required)
   - Email is saved to localStorage for automatic login on return visits
   - Email becomes the LaunchDarkly user context key for personalized flags
2. **Initialization**: App connects to LaunchDarkly SDK with user's email as context key
3. **Weather Fetch**: Fetches weather data based on enabled feature flags
   - If `show-air-quality` is on, includes AQI data in API call
   - If `show-forecast` is on, fetches 3-day forecast instead of current only
   - If `show-astronomy` is on, makes separate astronomy API call
4. **Dynamic Rendering**: UI renders based on all 10 flag values
5. **Real-time Updates**: Toggle any flag in LaunchDarkly dashboard and watch the page update instantly
6. **Auto-refresh**: Weather data refreshes automatically at the top of every minute
7. **Observability**: All interactions, errors, and Web Vitals tracked

## API Integration

The app intelligently calls different WeatherAPI endpoints based on feature flags:

- **Base**: `/current.json` - Current weather
- **With Forecast**: `/forecast.json?days=3` - 3-day forecast + hourly
- **With AQI**: `&aqi=yes` - Air quality data
- **With Alerts**: `&alerts=yes` - Weather alerts
- **Astronomy**: `/astronomy.json` - Sunrise/sunset/moon data

This demonstrates how feature flags can control not just UI but also API behavior and data fetching!

## Docker Deployment

The app includes Docker Compose support:

```bash
# Build and run
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f
```

Image name: `launchdarkly-demo-weatherapp-js`
Container name: `launchdarkly-demo-weatherapp-js`
Port: `5173`

## Technology Stack

- **LaunchDarkly JS Client SDK** (v3.9.0)
- **@launchdarkly/observability** (v0.4.8)
- **@launchdarkly/session-replay** (v0.4.8)
- **web-vitals** (v4.2.4)
- **WeatherAPI** - Weather data provider
- **Vite** (v5.0.0)
- **Vitest** (v4.0.13) - Testing framework
- **jsdom** (v27.2.0) - DOM testing environment
- **fast-check** (v4.3.0) - Property-based testing
- **Docker** - Containerization

## Observability Features

The app includes optional observability powered by highlight.io (via `@launchdarkly/observability`):

- **Network Recording**: Captures all HTTP requests
- **Session Replay**: Records user interactions
- **Error Tracking**: Test via "🐛 Record Test Error" button
- **Web Vitals**: CLS, FID, INP, LCP, FCP, TTFB tracked as histogram metrics

### Enabling Observability

Observability is **built into LaunchDarkly** and uses highlight.io as the backend. To enable:

1. **Go to your LaunchDarkly account**: https://app.launchdarkly.com/
2. **Navigate to Account Settings → Observability** (or Project Settings → Observability)
3. **Enable observability** for your project
4. **The SDK will automatically connect** - no additional configuration needed!

**Note**: You don't need to sign up for highlight.io separately. LaunchDarkly manages the observability backend for you once you enable it in your account settings.

## Testing

The app includes a comprehensive test suite with 20+ test files covering:

- **Bootstrap & initialization** - SDK setup and flag evaluation
- **Authentication flows** - Login, logout, user management
- **Location management** - Save, edit, delete locations
- **Weather data fetching** - API integration and error handling
- **UI rendering** - Card rendering and state management
- **Accessibility** - ARIA labels and keyboard navigation
- **Error handling** - Graceful degradation and error recovery
- **Integration flows** - End-to-end user scenarios

Run tests with:
```bash
npm test              # Run all tests once
npm run test:watch    # Run tests in watch mode
```

## Project Structure

```
.
├── index.html                          # Main HTML entry point
├── index.css                           # Responsive styling
├── src/                                # Source modules
│   ├── bootstrap.js                    # App initialization & SDK setup
│   ├── weatherDataFetcher.js           # Weather API integration
│   ├── locationCardRenderer.js         # Weather card rendering
│   ├── locationStorage.js              # Location persistence
│   ├── viewStateManager.js             # UI state management
│   ├── addLocationHandler.js           # Add location functionality
│   ├── editLocationHandler.js          # Edit location functionality
│   ├── deleteLocationHandler.js        # Delete location functionality
│   ├── authLocationIntegration.js      # Auth & location integration
│   └── errorHandler.js                 # Error handling utilities
├── test/                               # Comprehensive test suite
│   ├── setup.js                        # Test configuration
│   ├── bootstrap.test.js               # Bootstrap tests
│   ├── auth-integration.test.js        # Authentication tests
│   ├── location-storage.test.js        # Storage tests
│   ├── weather-data-fetcher.test.js    # API tests
│   ├── error-handling.test.js          # Error handling tests
│   ├── accessibility.test.js           # A11y tests
│   └── ... (20+ test files)
├── vitest.config.js                    # Test configuration
├── package.json                        # Dependencies & scripts
├── Dockerfile                          # Docker image definition
├── docker-compose.yml                  # Docker Compose configuration
├── .env                                # Your credentials (not in git)
└── .env.example                        # Environment template
```

## Troubleshooting

**"Please configure your LaunchDarkly client-side ID"**
- Add `VITE_LD_CLIENT_SIDE_ID` to `.env`
- Restart dev server

**Mock weather data showing**
- Add `VITE_WEATHER_API_KEY` to `.env`
- Verify API key at https://www.weatherapi.com/

**Flags not updating**
- Check flag keys match exactly (case-sensitive)
- Verify flags exist in LaunchDarkly project
- Check browser console for errors

**Docker container not starting**
- Ensure `.env` file exists with credentials
- Check port 5173 is not already in use

## Learn More

- [LaunchDarkly JavaScript SDK](https://docs.launchdarkly.com/sdk/client-side/javascript)
- [LaunchDarkly Observability](https://launchdarkly.com/docs/sdk/observability/javascript)
- [WeatherAPI Documentation](https://www.weatherapi.com/docs/)
- [Web Vitals](https://web.dev/vitals/)

## License

This sample application is provided as-is for demonstration purposes.
