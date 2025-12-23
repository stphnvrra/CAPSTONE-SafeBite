# SafeBite Project - Complete Documentation

## What is SafeBite?
SafeBite is a mobile app that helps people find safe routes to restaurants in Butuan City, Philippines. It shows crime data on a map and helps users avoid dangerous areas when walking to restaurants.

## Project Structure
This workspace contains three main components:

### 1. Mobile App (`safebite/` folder)
- **What it does**: Android app that shows restaurants and crime safety data
- **Technology**: React Native (Android only)
- **Main features**: 
  - Interactive map with restaurant locations
  - Crime heatmap overlay
  - Safe route planning
  - User login and registration
  - AR navigation (launches Unity AR app)

### 2. Admin Tool (`admin/` folder)
- **What it does**: Web interface for managing crime zone data in Firebase
- **Technology**: FastAPI (Python web framework)
- **Main features**:
  - User authentication (admin login required)
  - Dashboard with crime zone statistics
  - Add/edit/delete crime zones with GeoJSON polygons
  - Automatic risk level calculation (high/moderate/low)
  - Start and end point coordinates for streets
  - Real-time updates to Firebase Firestore

### 3. AR Navigation (`AR/` folder)
- **What it does**: Unity C# scripts for AR navigation functionality
- **Technology**: Unity (C# scripts for Android AR)
- **Main features**:
  - GPS location tracking
  - Firebase route fetching and visualization
  - AR polyline route rendering
  - Turn-by-turn navigation
  - External app launcher (2D view button)
  - Navigation UI with distance and bearing information

## What You Need to Run This Project

### For the Mobile App:
- **Node.js** version 18 or higher
- **Java** version 17 (recommended: Temurin/Adoptium)
- **Android Studio** with Android SDK (API 34 or newer)
- **Android device** or emulator

### For the Admin Tool:
- **Python** version 3.10 or higher
- **Firebase project** with Firestore enabled
- **Firebase service account** JSON file

### For AR Navigation:
- **Unity** (version 2020.3 or later recommended)
- **AR Foundation** package for Unity
- **Firebase SDK** for Unity
- **Android device** with ARCore support

## How to Set Up and Run Everything

### Step 1: Set Up the Mobile App

1. **Install dependencies**:
   ```bash
   cd safebite
   npm install
   ```

2. **Configure Firebase**:
   - Go to Firebase Console → Project Settings → Android app
   - Download `google-services.json` file
   - **Copy the downloaded file to `safebite/android/app/google-services.json`**
   - Note: `google-services.json` is gitignored for security (contains Firebase API keys)
   - See `safebite/android/app/google-services.json.example` for structure reference

3. **Configure Mapbox**:
   - Get a Mapbox access token from mapbox.com
   - Edit `safebite/src/config/env.ts`:
   ```typescript
   export const CONFIG = {
     MAPBOX_ACCESS_TOKEN: 'your_mapbox_token_here',
   } as const;
   ```

4. **Run the app**:
   ```bash
   npm run android
   ```

### Step 2: Set Up the Admin Tool

1. **Create virtual environment**:
   ```bash
   cd admin
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. **Install Python packages**:
   ```bash
   pip install -r requirements.txt
   ```
   This installs:
   - `fastapi[standard]` - Web framework
   - `firebase-admin` - Firebase Admin SDK

3. **Set up Firebase**:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Rename it to `[your-service-account].json` (use your actual service account filename)
   - Place it in the `admin/` folder
   - Ensure Firestore is enabled in your Firebase project

4. **Configure Firebase API key (optional)**:
   - The admin tool can automatically detect the Firebase Web API key from `google-services.json`
   - Or set it as environment variable: `export FIREBASE_WEB_API_KEY=your_api_key`

5. **Run the admin tool**:
   ```bash
   fastapi dev main.py --port 8080
   ```
   - Open http://127.0.0.1:8080 in your browser
   - Login 

### Step 3: Set Up AR Navigation (Unity)

1. **Create Unity project**:
   - Open Unity Hub
   - Create new 3D project (or AR Foundation project template)
   - Set build target to Android

2. **Install required packages**:
   - Window → Package Manager
   - Install **AR Foundation** (requires ARCore XR Plugin for Android)
   - Install **Firebase SDK for Unity** from Firebase website

3. **Add AR scripts**:
   - Copy all `.cs` files from `AR/` folder to your Unity project `Assets/Scripts/`
   - Scripts included:
     - `ARNavigationManager.cs` - Main navigation controller
     - `NavigationUIManager.cs` - UI management and external app launcher
     - `FirebaseRouteManager.cs` - Firebase route data fetching
     - `ARGPSManager.cs` - GPS location tracking
     - `GPSUtils.cs` - GPS utility functions
     - `FirebaseTestData.cs` - Testing utilities

4. **Configure Firebase**:
   - Add `google-services.json` to Unity project
   - Initialize Firebase in your scene

5. **Set up scene**:
   - Add AR Session and AR Session Origin
   - Create empty GameObject and attach `ARNavigationManager`
   - Create empty GameObject and attach `NavigationUIManager`
   - Create empty GameObject and attach `FirebaseRouteManager`
   - Create empty GameObject and attach `ARGPSManager`
   - Configure LineRenderer component for route visualization
   - Add arrow prefab for destination marker

6. **Build and deploy**:
   - File → Build Settings → Android
   - Build APK and install on ARCore-compatible device

## Available Commands

### Mobile App Commands:
- `npm run android` - Build and install app on Android device/emulator
- `npm run start` - Start Metro bundler for development
- `npm run lint` - Check code for errors
- `npm test` - Run tests (currently no tests configured)

### Admin Tool Commands:
- `fastapi dev main.py --port 8080` - Start development server (from admin/ folder)
- `fastapi dev main.py --port 8080 --reload` - Start with auto-reload
- `uvicorn main:app --host 0.0.0.0 --port 8080` - Production server

## How the App Works

### User Flow:
1. **Login/Register**: Users create accounts with username and password
2. **Map View**: Users see Butuan City map with restaurant markers
3. **Search**: Users can search for specific restaurants
4. **Route Planning**: Users can get directions that avoid high-crime areas
5. **AR Navigation**: Users can launch AR app for turn-by-turn directions

### Data Flow:
1. **Crime Data**: Admin tool uploads crime zones to Firebase Firestore (`crimeZones` collection)
2. **Route Data**: Mobile app calculates routes and stores them in Firebase (`routes` collection)
3. **AR Navigation**: Unity AR app fetches routes from Firebase and displays them in AR
4. **Restaurant Data**: Mobile app fetches restaurant locations from Mapbox
5. **User Data**: User accounts and preferences stored in Firebase Authentication and Firestore

## Important Files and Folders

### Mobile App (`safebite/`):
- `App.tsx` - Main app component
- `index.js` - App entry point
- `src/screens/` - Login, Register, and Map screens
- `src/components/` - Reusable UI components
- `src/lib/` - App logic (maps, Firebase, routing, etc.)
- `src/config/env.ts` - Configuration settings
- `android/` - Android native code and build files

### Admin Tool (`admin/`):
- `main.py` - FastAPI application with all routes and logic
- `templates/` - HTML templates:
  - `index.html` - Main dashboard with crime zones table
  - `form.html` - Add/edit crime zone form
  - `login.html` - Admin login page
- `requirements.txt` - Python dependencies
- `[your-service-account].json` - Firebase service account file (not in repo, keep secure)

### AR Navigation (`AR/`):
- `ARNavigationManager.cs` - Main navigation logic, GPS tracking, route visualization
- `NavigationUIManager.cs` - UI management, navigation info display, external app launcher
- `FirebaseRouteManager.cs` - Fetches and parses route data from Firebase Firestore
- `ARGPSManager.cs` - GPS location service wrapper
- `GPSUtils.cs` - GPS utility functions (coordinate conversion, distance, bearing calculations)
- `FirebaseTestData.cs` - Test utilities for adding sample routes to Firebase

## Troubleshooting Common Issues

### Mobile App Issues:

**Metro bundler problems**:
```bash
npm start -- --reset-cache
rm -rf android/.gradle android/app/build
cd android && ./gradlew clean
```

**Android build errors**:
- Open Android Studio → SDK Manager → install required SDKs
- Check Java version: `java -version` (should be 17)
- Ensure Android SDK is properly configured

**Map not showing**:
- Verify Mapbox token in `src/config/env.ts`
- Check network connection
- Look at Android logs: `adb logcat | grep -i mapbox`

**Firebase errors**:
- Confirm `google-services.json` exists in correct location
- Check Firebase project settings match app package name

### Admin Tool Issues:

**Python environment problems**:
- Make sure you're using Python 3.10+
- Activate virtual environment before running
- Reinstall requirements if needed: `pip install -r requirements.txt`

**Firebase connection issues**:
- Verify service account JSON file is in correct location
- Check Firebase project permissions
- Ensure Firestore is enabled in Firebase Console
- Verify the service account has Firestore read/write permissions

**Admin login issues**:
- Default credentials: username `admin`, password `[default-password]` (change in production!)
- Ensure Firebase Authentication is enabled
- Check that the admin user has `superadmin` role in Firestore (`users/{uid}` document)
- Verify Firebase Web API key is accessible (check `google-services.json` or environment variable)

**Crime zone form issues**:
- Coordinates must be valid: latitude (-90 to 90), longitude (-180 to 180)
- Polygon requires at least 3 coordinate points
- Risk level is auto-calculated from crime score but can be manually overridden
- Crime score thresholds: ≥4.5 = high, ≥3.0 = moderate, <3.0 = low

### AR Navigation Issues:

**GPS not working**:
- Ensure location permissions are granted on Android device
- Check that device has GPS enabled
- Verify ARCore is installed and device is ARCore-compatible
- Check Unity logs for GPS initialization errors

**Firebase route not loading**:
- Verify Firebase is initialized in Unity scene
- Check `routes` collection exists in Firestore
- Ensure route data has correct format (origin, destination, geometry with coordinates)
- Check Unity console for Firebase connection errors

**Route not displaying**:
- Verify LineRenderer component is assigned to ARNavigationManager
- Check that route coordinates are in correct format (nested or flat array)
- Ensure AR Session Origin is set up correctly
- Verify GPS is providing valid coordinates

**External app launch issues**:
- Check that SafeBite app package name matches (`com.safebite`)
- Verify target activity name is correct (`com.safebite.MainActivity`)
- Ensure SafeBite app is installed on the device
- Check Android logs for launch intent errors

## Building for Production

### Mobile App:
**Debug APK**:
```bash
cd android
./gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

**Release AAB** (for Google Play Store):
```bash
cd android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Admin Tool:
The admin tool runs as a web service. For production deployment, use:
```bash
cd admin
uvicorn main:app --host 0.0.0.0 --port 8080
```

**Production Considerations**:
- Change `SESSION_SECRET` in `main.py` (line 48) to a secure random value
- Use environment variables for sensitive configuration
- Consider adding HTTPS/SSL
- Implement proper authentication for production use
- Set up firewall rules to restrict access

### AR Navigation:
Build Unity project for Android:
1. File → Build Settings → Android
2. Configure build settings (package name, version, etc.)
3. Build APK or Android App Bundle
4. Install on ARCore-compatible device

## Admin Tool Details

### Authentication
- **Default Admin Account**:
  - Username: `admin`
  - Password: `[default-password]` (change in production!)
  - Role: `superadmin` (automatically created on first startup)
- **Session Management**: Uses secure session cookies
- **Access Control**: Only users with `superadmin` role can access admin interface

### Crime Zone Data Structure
Each crime zone in Firestore contains:
```typescript
{
  street_name: string,              // Name of the street/area
  averageCrimeScore: number,        // Safety score (0-5+)
  riskLevel: "high" | "moderate" | "low",  // Auto-calculated or manual
  startPoint: GeoPoint,             // Starting coordinates
  endPoint: GeoPoint,               // Ending coordinates
  geoJsonPolygon: string,           // GeoJSON polygon as JSON string
  lastUpdated: Timestamp            // Server timestamp
}
```

### Risk Level Calculation
- **High Risk**: Crime score ≥ 4.5
- **Moderate Risk**: Crime score ≥ 3.0
- **Low Risk**: Crime score < 3.0
- Can be manually overridden in the form

### Admin Dashboard Features
- **Statistics Cards**: Shows total streets, high/moderate/low risk counts
- **Crime Zones Table**: Lists all crime zones with edit/delete actions
- **Add/Edit Forms**: Support for up to 5 polygon coordinates
- **GeoJSON Support**: Polygon data stored as GeoJSON strings

## AR Navigation Details

### Components Overview

**ARNavigationManager**:
- Manages GPS initialization and tracking
- Handles route visualization with LineRenderer
- Updates navigation waypoints as user moves
- Calculates distance and bearing to next waypoint
- Supports both Firebase routes and manual routes

**NavigationUIManager**:
- Creates and manages navigation UI overlay
- Displays navigation info (status, distance, bearing)
- Provides "2D" button to launch SafeBite app
- Handles external app launch with multiple fallback methods

**FirebaseRouteManager**:
- Fetches latest route from Firestore `routes` collection
- Supports both flat array and nested array coordinate formats
- Auto-detects coordinate format
- Provides test methods for adding sample routes

**ARGPSManager**:
- Singleton GPS location service
- Continuously updates latitude/longitude
- Provides location status to other components

**GPSUtils**:
- GPS to meter conversion using Earth radius calculations
- Distance calculation using Haversine formula
- Bearing calculation between two GPS points
- Coordinate to relative position conversion

### Route Data Format
Routes in Firestore should have this structure:
```typescript
{
  origin: { lat: number, lon: number },
  destination: { lat: number, lon: number },
  geometry: {
    type: "LineString",
    coordinates: [[lon, lat], ...]  // Nested array format
    // OR
    coordinates: [lon, lat, lon, lat, ...]  // Flat array format
  },
  userId: string,
  createdAt: Timestamp
}
```

### Navigation Flow
1. User launches AR app
2. GPS initializes and gets current location
3. FirebaseRouteManager fetches latest route from Firestore
4. ARNavigationManager converts route coordinates to 3D positions
5. LineRenderer displays route as blue polyline
6. Navigation updates as user moves toward destination
7. User can tap "2D" button to return to SafeBite mobile app

## Integration Between Components

### Mobile App ↔ AR App
- Mobile app calculates route using Mapbox Directions API
- Route saved to Firebase Firestore `routes` collection
- AR app fetches route from Firebase and displays in AR
- "2D" button in AR app launches mobile app using Android intents

### Admin Tool ↔ Mobile App
- Admin tool manages crime zones in Firebase `crimeZones` collection
- Mobile app reads crime zones to display heatmap overlay
- Risk levels and crime scores affect route calculations
- Changes in admin tool appear immediately in mobile app

### Admin Tool ↔ AR App
- Admin tool manages crime zones that affect routing
- AR app uses routes calculated by mobile app (which considers crime zones)
- Indirect relationship through mobile app's route calculation

## Important Notes

- **iOS Support**: This app is Android-only. iOS project has been removed.
- **Unity AR**: AR navigation requires Unity project with AR Foundation
- **ARCore Required**: Android device must support ARCore for AR navigation
- **Location Permissions**: Both mobile app and AR app request location access
- **Internet Required**: App needs internet for maps, restaurants, crime data, and route fetching
- **Firebase Dependency**: All components depend on Firebase for data storage
- **Academic Use**: This is a capstone project for educational purposes

## Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Look at Android logs: `adb logcat`
3. Check Metro bundler output for JavaScript errors
4. Verify all configuration files are in correct locations
5. Ensure all dependencies are properly installed

## License
This project is for academic/capstone use only.

