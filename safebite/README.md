# SafeBite Mobile App - Complete Guide

## What is SafeBite?
SafeBite is an Android mobile app that helps people in Butuan City, Philippines find safe routes to restaurants. It shows crime data on a map and calculates routes that avoid dangerous areas.

## Key Features
- **Interactive Map**: View Butuan City with restaurant locations using Mapbox
- **Crime Heatmap**: Visualize crime zones with color-coded risk levels
  - Red = High risk (3.1-5+ crime score)
  - Orange = Moderate risk (2.1-3.0 crime score)
  - Low risk zones are filtered from heatmap
- **Restaurant Search**: Find restaurants by name using Mapbox Places API
- **Safe Route Planning**: Calculate routes that avoid high-crime areas
  - Automatic route selection with multiple alternatives
  - Route exposure calculation to find safest paths
  - Safety warnings when strict safe routes aren't available
- **User Accounts**: Login and registration system with Firebase Authentication
- **AR Navigation**: Launch Unity AR app for turn-by-turn directions
  - Routes automatically saved to Firebase for AR consumption
  - Package name: `com.safebitear`

## Technology Stack
- **Framework**: React Native 0.80.2 (Android only)
- **Language**: TypeScript
- **Maps**: Mapbox (@rnmapbox/maps 10.1.41-rc.2)
- **Database**: Firebase React Native SDK
  - Firebase Authentication (Email/Password)
  - Cloud Firestore
- **Navigation**: React Navigation 7.x (Native Stack Navigator)
- **Location**: React Native Geolocation Service
- **Permissions**: React Native Permissions
- **HTTP Client**: Axios
- **UI Components**: React Native Vector Icons, React Native SVG

## What You Need Before Starting

### Required Software:
- **Node.js** version 18 or higher
- **Java** version 17 (recommended: Temurin/Adoptium)
- **Android Studio** with Android SDK (API 34 or newer)
- **Android device** or emulator

### Required Accounts:
- **Firebase account** (for user authentication and data storage)
- **Mapbox account** (for maps and restaurant data)

## Step-by-Step Setup Guide

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Firebase

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project (or use existing SafeBite project)
   - Enable Authentication → Sign-in method → Email/Password (enable)
   - Enable Firestore Database → Create database (Start in test mode or production mode)

2. **Add Android App**:
   - In Firebase Console → Project Settings → General
   - Click "Add app" → Android
   - Package name: `com.safebite` (must match exactly)
   - App nickname: "SafeBite Android" (optional)
   - Download `google-services.json`
   - **Copy the downloaded file to `android/app/google-services.json`**
   - Note: `google-services.json` is gitignored for security. See `google-services.json.example` for structure reference.

3. **Firestore Security Rules** (for development):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
   **Note**: Use production security rules for production deployment

### Step 3: Configure Mapbox

1. **Get Mapbox Token**:
   - Go to [Mapbox](https://www.mapbox.com/)
   - Create account and get access token
   - Copy your public token

2. **Add Token to App**:
   - Edit `src/config/env.ts`:
   ```typescript
   export const CONFIG = {
     MAPBOX_ACCESS_TOKEN: 'your_mapbox_token_here',
   } as const;
   ```

### Step 4: Run the App
```bash
npm run android
```

This will:
- Start Metro bundler
- Build Android app
- Install on connected device/emulator

## Available Commands

### Development Commands:
- `npm run android` - Build and install app on Android
- `npm run start` - Start Metro bundler only
- `npm run lint` - Check code for errors and style issues
- `npm test` - Run tests (currently no tests configured)

### Build Commands:
- `cd android && ./gradlew assembleDebug` - Build debug APK
- `cd android && ./gradlew bundleRelease` - Build release AAB

## How the App Works

### User Experience:
1. **First Time**: User opens app and sees login screen
2. **Registration**: User creates account with username and password
3. **Login**: User logs in and sees main map screen
4. **Map View**: User sees Butuan City map with crime heatmap overlay
5. **Search**: User searches for restaurants using search box
6. **Select Restaurant**: User taps restaurant marker to see details
7. **Get Directions**: User gets safe route avoiding high-crime areas
8. **AR Navigation**: User can launch Unity AR app for navigation

### Technical Flow:
1. **App Launch**: 
   - Firebase initializes automatically
   - Mapbox access token is set
   - User authentication state is checked
   - If not logged in, redirects to login screen

2. **Map Loading**: 
   - Mapbox loads map tiles with Butuan City bounds
   - Crime zones are fetched from Firestore `crimeZones` collection
   - Heatmap is generated from crime zone polygons
   - User location is tracked via GPS

3. **Restaurant Search**: 
   - User searches via Mapbox Places API
   - Results appear as markers on the map
   - Restaurant details shown in bottom sheet

4. **Route Calculation**: 
   - App fetches multiple route alternatives from Mapbox Directions API
   - Each route is sampled and checked against crime zone polygons
   - Routes are scored by exposure to high-risk crime zones
   - Safest route is automatically selected
   - If no strictly safe route exists, user is warned and can proceed with lowest-exposure route

5. **Route Saving**: 
   - Selected route is saved to Firestore `routes` collection
   - Coordinates are flattened for Firestore compatibility: `[lon1, lat1, lon2, lat2, ...]`
   - Route includes origin, destination, geometry, and optional navigation steps
   - Saved routes are immediately available for AR app

6. **AR Launch**: 
   - Native Android module checks if Unity AR app is installed
   - If installed, launches `com.safebitear` package
   - AR app fetches latest route from Firebase for navigation

## Important Files and Folders

### Root Files:
- `App.tsx` - Main app component that mounts navigation
- `index.js` - App entry point, initializes Firebase
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

### Source Code (`src/`):
- `screens/` - Main app screens:
  - `LoginScreen.tsx` - User login form with Firebase Authentication
  - `RegisterScreen.tsx` - User registration with username validation
  - `MainMapScreen.tsx` - Main map screen with all features:
    - Mapbox map view with Butuan City bounds
    - Crime heatmap overlay (high/moderate risk zones)
    - Restaurant markers and search
    - Route visualization and selection
    - User location tracking

- `components/` - Reusable UI components:
  - `RestaurantSearchBox.tsx` - Search input with Mapbox Places autocomplete
  - `RestaurantBottomSheet.tsx` - Bottom sheet showing restaurant details with directions button
  - `HeatmapLegend.tsx` - Legend showing moderate (orange) and high (red) risk levels
  - `LogoutModal.tsx` - Modal for confirming user logout
  - `SafeRouteModal.tsx` - Warning modal when no strictly safe route is available

- `lib/` - App logic and utilities:
  - `firebase.ts` - Firebase initialization, authentication, and crime zone fetching
    - Fetches crime zones from Firestore with GeoJSON polygon parsing
    - Supports Polygon and MultiPolygon geometries
    - Bounding box filtering for performance
  - `mapbox.ts` - Mapbox API integration
    - Directions API with alternatives
    - Directions via waypoints for route optimization
  - `places.ts` - Mapbox Places API for restaurant search
  - `routes.ts` - Route persistence to Firebase
    - Flattens coordinates for Firestore: `[lon1, lat1, lon2, lat2, ...]`
    - Supports navigation steps for turn-by-turn directions
    - Saves to `routes` collection with user ID
  - `crime.ts` - Crime zone processing and route safety analysis
    - Polygon intersection checking
    - Route exposure calculation (samples route at 7.5m intervals)
    - Safe route selection algorithms
    - High-risk polygon filtering
  - `location.ts` - GPS location handling and permissions
  - `permissions.ts` - Location permission requests
  - `unityLauncher.ts` - Unity AR app launcher
    - Checks if `com.safebitear` is installed
    - Launches Unity app via native Android module
  - `utils.ts` - Helper functions and utilities

- `navigation/` - App navigation:
  - `RootNavigator.tsx` - Root navigation container with stack navigator
    - Login → Register → MainMap screens
    - Header hidden for full-screen experience

- `config/` - Configuration:
  - `env.ts` - Mapbox access token configuration

- `theme/` - Styling:
  - `typography.ts` - Font definitions and typography styles

### Android Native (`android/`):
- `app/build.gradle` - Android build configuration
- `app/src/main/AndroidManifest.xml` - Android app manifest
- `app/src/main/java/` - Native Android code
- `app/google-services.json` - Firebase configuration

## Configuration Details

### Firebase Setup:
- **Authentication**: Email/Password enabled
  - Usernames converted to email format: `{username}@user.safebite.local`
  - User profiles stored in Firestore
  
- **Firestore Collections**:
  - `users/{uid}` - User profiles with username, fullName, email, createdAt
  - `usernames/{username}` - Username to UID mapping for registration validation
  - `crimeZones/{id}` - Crime zone data:
    - `street_name`: Street or area name
    - `averageCrimeScore`: Decimal crime score
    - `riskLevel`: "high" | "moderate" | "low"
    - `geoJsonPolygon`: GeoJSON polygon as JSON string
    - `startPoint` / `endPoint`: Optional GeoPoint coordinates
    - `lastUpdated`: Server timestamp
  - `routes/{id}` - Saved routes for AR navigation:
    - `origin`: { lon, lat }
    - `destination`: { lon, lat }
    - `geometry`: { type: "LineString", coordinates: [lon1, lat1, lon2, lat2, ...] } (flattened array)
    - `steps`: Optional turn-by-turn navigation steps
    - `userId`: Reference to user (`users/{uid}`)
    - `createdAt`: Server timestamp

### Mapbox Setup:
- **Access Token**: Required for maps and API calls
- **Style**: Street map style
- **Bounds**: Restricted to Butuan City area
- **Features**: Places search, directions, geocoding

### Permissions Required:
- **Location**: For GPS positioning and route planning
- **Internet**: For maps, restaurants, and crime data
- **Storage**: For caching map data

## Troubleshooting

### Common Issues and Solutions:

**App won't start**:
```bash
# Clear Metro cache
npm start -- --reset-cache

# Clean Android build
rm -rf android/.gradle android/app/build
cd android && ./gradlew clean
```

**Map not showing**:
- Check Mapbox token in `src/config/env.ts`
- Verify internet connection
- Check Android logs: `adb logcat | grep -i mapbox`

**Firebase errors**:
- Confirm `google-services.json` is in `android/app/`
- Check Firebase project settings
- Verify package name matches `com.safebite`

**Build errors**:
- Open Android Studio → SDK Manager → install required SDKs
- Check Java version: `java -version` (should be 17)
- Ensure Android SDK is properly configured

**Location not working**:
- Enable location services on device/emulator
- Grant location permission to app
- Check GPS settings

**AR not launching**:
- Install Unity AR app with package name `com.safebitear`
- Check if Unity app is properly installed on device
- Verify native Android module is properly linked
- Check Android logs: `adb logcat | grep -i unity`
- Ensure route is saved to Firebase before launching AR (route is auto-saved on route calculation)

### Debug Commands:
```bash
# View Android logs
adb logcat

# View Metro bundler logs
npm start

# Check for JavaScript errors
npm run lint

# Test Firebase connection
# (Check Firebase Console for errors)
```

## Building for Production

### Debug Build (for testing):
```bash
cd android
./gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release Build (for distribution):
```bash
cd android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

**Note**: Release builds require signing configuration. See Android documentation for details.

## Route Safety Algorithm

The app implements sophisticated route safety analysis to help users avoid dangerous areas:

### How It Works:

1. **Route Alternatives**:
   - Fetches multiple route alternatives from Mapbox Directions API (typically 3-5 routes)
   - Each route has different characteristics (distance, duration, path)

2. **Crime Zone Intersection**:
   - Crime zones are stored as GeoJSON polygons in Firestore
   - Each route is sampled at 7.5-meter intervals along its path
   - For each sample point, checks if it intersects any crime zone polygon

3. **Route Exposure Calculation**:
   - Calculates total exposure for each route by summing crime scores of intersecting zones
   - Counts number of sample points inside crime zones
   - Routes with no high-risk intersections are marked as "strictly safe"

4. **Route Selection**:
   - **First Priority**: Selects routes with zero high-risk zone intersections
   - **Second Priority**: If no strictly safe route exists, selects route with lowest total exposure
   - **User Warning**: When no strictly safe route exists, shows modal warning user of potential risk

5. **Waypoint Optimization** (if needed):
   - If initial routes all intersect high-risk zones, tries adding waypoints to avoid them
   - Recalculates routes through safer paths

### Safety Features:

- **Automatic Selection**: App automatically picks safest route without user intervention
- **Transparency**: Users are warned when no strictly safe route exists
- **Flexibility**: Users can proceed with lowest-exposure route if needed
- **Real-time**: Uses latest crime zone data from Firebase

## Data Structure

### Crime Zones (Firestore):
```typescript
{
  street_name: string,                    // Name of street/area
  startPoint?: GeoPoint,                  // Optional starting point (lat, lng)
  endPoint?: GeoPoint,                    // Optional ending point (lat, lng)
  averageCrimeScore: number,              // Crime score (decimal, e.g., 1.5, 3.2, 4.8)
  riskLevel: 'high' | 'moderate' | 'low', // Risk level classification
  geoJsonPolygon?: string,                // GeoJSON Polygon/MultiPolygon as JSON string
  lastUpdated: Timestamp                  // Server timestamp
}
```

**Risk Level Classification**:
- **High**: Crime score ≥ 3.1 (shown in red on heatmap)
- **Moderate**: Crime score 2.1-3.0 (shown in orange on heatmap)
- **Low**: Crime score < 2.1 (filtered from heatmap display)

### User Data (Firestore):
```typescript
{
  username: string,
  fullName: string,
  email: string, // Synthetic email for Firebase Auth
  createdAt: server timestamp
}
```

### Routes (Firestore):
Routes are saved with flattened coordinates for Firestore compatibility:
```typescript
{
  origin: { lon: number, lat: number },
  destination: { lon: number, lat: number },
  geometry: {
    type: 'LineString',
    coordinates: number[]  // Flattened: [lon1, lat1, lon2, lat2, lon3, lat3, ...]
  },
  steps?: NavigationStep[],  // Optional turn-by-turn navigation steps
  userId: string,            // Reference: "users/{uid}"
  createdAt: Timestamp       // Server timestamp
}

type NavigationStep = {
  instruction: string,       // Turn instruction text
  distance: number,          // Distance in meters
  location: { lon: number, lat: number }  // Step location
}
```

**Note**: Coordinates are flattened (single array) instead of nested arrays `[[lon, lat], ...]` to avoid Firestore nested array limitations. The AR app can parse both formats.

## Important Notes

- **Android Only**: iOS support has been removed
- **Butuan City Focus**: App is specifically designed for Butuan City, Philippines
  - Map bounds restricted to Butuan City area
  - Coordinates approximately: lat 8.94-8.99, lng 125.54-125.60
- **Internet Required**: App needs internet for:
  - Mapbox map tiles and directions
  - Firebase Firestore for crime zones and routes
  - Firebase Authentication
- **Location Required**: GPS needed for:
  - Route planning (origin point)
  - User position on map
  - AR navigation (when launched)
- **Unity AR Dependency**: 
  - AR navigation requires separate Unity app installation
  - Package name: `com.safebitear`
  - Routes are automatically saved to Firebase when calculated
  - AR app fetches latest route from Firestore
- **Route Safety**: 
  - App automatically selects routes avoiding high-risk crime zones
  - If no strictly safe route exists, shows warning and offers lowest-exposure route
  - Route exposure calculated by sampling route at 7.5-meter intervals
- **Heatmap Display**: 
  - Shows moderate (orange) and high (red) risk zones only
  - Low-risk zones are filtered from heatmap to reduce clutter
- **Academic Project**: This is a capstone project for educational purposes

## Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Look at Android logs: `adb logcat`
3. Check Metro bundler output for JavaScript errors
4. Verify all configuration files are in correct locations
5. Ensure all dependencies are properly installed
6. Check Firebase Console for database/authentication errors

## License
This project is for academic/capstone use only.
