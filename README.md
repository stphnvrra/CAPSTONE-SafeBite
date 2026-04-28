# 🛡️ SafeBite: Safe Routing & Crime Awareness Platform

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Unity](https://img.shields.io/badge/Unity-100000?style=for-the-badge&logo=unity&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

**SafeBite** is a comprehensive mobile and web platform designed to help people find safe routes to restaurants in Butuan City, Philippines. By leveraging crime data, interactive mapping, and Augmented Reality (AR) navigation, SafeBite ensures users can avoid high-risk areas while walking to their destinations.

---

## 📑 Table of Contents
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Usage & Data Flow](#-usage--data-flow)
- [Development Commands](#-development-commands)
- [Troubleshooting](#-troubleshooting)
- [Disclaimer](#-disclaimer)

---

## 🏗 System Architecture

The SafeBite ecosystem consists of three integrated components working seamlessly together:

### 1. Mobile App (`safebite/`)
The primary user interface built for Android. It allows users to view restaurant locations, check crime heatmaps, and plan safe routes.


### 2. Admin Dashboard (`admin/`)
A secure web portal for local authorities or administrators to manage crime zone data. It supports defining high-risk areas using GeoJSON polygons, which directly influence the mobile app's routing algorithms.

### 3. AR Navigation (`AR/`)
An immersive Augmented Reality application built in Unity. It provides turn-by-turn navigation by overlaying safe routes onto the real world using the device's camera.

---

## ✨ Key Features

- **Interactive Safety Map**: View Butuan City with restaurant markers and an overlay of crime heatmaps.
- **Smart Route Planning**: Automatically calculates walking directions that actively avoid designated high-crime zones.
- **AR Turn-by-Turn Navigation**: Seamlessly transition from 2D maps to 3D Augmented Reality for intuitive street-level guidance.
- **Real-time Crime Data Management**: Admin portal allows instant updates to crime zones, reflecting immediately on user devices.
- **Automated Risk Assessment**: Admin tool automatically categorizes areas into High, Moderate, or Low risk based on crime scores.

---

## 💻 Technology Stack

| Component | Technologies Used |
| :--- | :--- |
| **Mobile App** | React Native, Mapbox API, Firebase Auth & Firestore |
| **Admin Tool** | Python 3.10+, FastAPI, Firebase Admin SDK, HTML/CSS |
| **AR Navigation** | Unity (C#), AR Foundation, ARCore, Firebase SDK |

---

## 📋 Prerequisites

Ensure your development environment meets the following requirements before proceeding:

- **Node.js** v18+ & **Java** v17 (Temurin/Adoptium recommended)
- **Android Studio** with Android SDK (API 34+) and an ARCore-compatible Android device/emulator
- **Python** v3.10+
- **Unity** 2020.3+ with AR Foundation
- **Firebase Project** with Firestore, Authentication, and a Service Account JSON file
- **Mapbox Access Token** for map rendering

---

## 🚀 Installation & Setup

### 1. Mobile App Setup
```bash
# Install dependencies
cd safebite
npm install
```
- **Firebase Config**: Copy your `google-services.json` to `safebite/android/app/`.
- **Mapbox Config**: Edit `safebite/src/config/env.ts` and add your access token:
  ```typescript
  export const CONFIG = { MAPBOX_ACCESS_TOKEN: 'your_mapbox_token_here' } as const;
  ```
- **Run the App**: `npm run android`

### 2. Admin Tool Setup
```bash
# Setup Python virtual environment
cd admin
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```
- **Firebase Config**: Download your Firebase Service Account JSON and place it in the `admin/` folder.
- **Run the Server**: `fastapi dev main.py --port 8080` (Access at `http://127.0.0.1:8080`)

### 3. AR Navigation Setup
- Open Unity Hub and create a new 3D/AR Foundation project (Android build target).
- Install **AR Foundation** and **Firebase SDK for Unity**.
- Copy all `.cs` scripts from the `AR/` folder into `Assets/Scripts/`.
- Attach scripts (`ARNavigationManager`, `NavigationUIManager`, etc.) to scene GameObjects.
- Build the APK via **File → Build Settings → Android**.

---

## 🔄 Usage & Data Flow

1. **Data Entry**: Administrators log into the web dashboard to draw crime zones (polygons) and assign crime scores.
2. **Synchronization**: Data is instantly saved to Firebase Firestore (`crimeZones` collection).
3. **Route Request**: A user opens the SafeBite app, selects a restaurant, and requests a route.
4. **Safe Routing**: The app queries Mapbox, applying the Firestore crime zones as avoidance areas, and saves the safe route to Firebase.
5. **AR Guidance**: The user taps "AR Mode", launching the Unity app which fetches the route from Firebase and projects it into the real world.

---

## 🛠 Development Commands

### Mobile App (`safebite/`)
- `npm run android` - Build and run on connected Android device/emulator
- `npm start` - Start Metro bundler
- `npm run lint` - Run code linting

### Admin Tool (`admin/`)
- `fastapi dev main.py --port 8080` - Start development server with auto-reload
- `uvicorn main:app --host 0.0.0.0 --port 8080` - Start production server

### Production Builds
- **Mobile (AAB)**: `cd android && ./gradlew bundleRelease`
- **Mobile (APK)**: `cd android && ./gradlew assembleDebug`

---

## 🔧 Troubleshooting

- **Metro Bundler Issues**: Run `npm start -- --reset-cache` or clean gradle with `cd android && ./gradlew clean`.
- **Map Not Loading**: Verify your Mapbox token in `env.ts` and ensure the device has internet access.
- **Admin Login Fails**: Ensure Firebase Authentication is enabled and the user holds the `superadmin` role in Firestore.
- **AR Route Not Displaying**: Check if the device supports ARCore, location permissions are granted, and the `routes` collection in Firestore is properly formatted.

---

## 📄 Disclaimer

*This project was developed for academic and capstone purposes only. The crime data utilized may be simulated or historical and should not be used as the sole resource for personal safety decisions.*


