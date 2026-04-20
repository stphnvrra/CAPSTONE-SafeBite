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
  

## How the App Works

### User Flow:
1. **Login/Register**: Users create accounts with username and password
2. **Map View**: Users see Butuan City map with restaurant markers
3. **Search**: Users can search for specific restaurants
4. **Route Planning**: Users can get directions that avoid high-crime areas
5. **AR Navigation**: Users can launch AR app for turn-by-turn directions

## License
This project is for academic/capstone use only.

