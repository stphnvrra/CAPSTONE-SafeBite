## SafeBite Capstone — End‑to‑End Step‑by‑Step Build Guide (Client App)

This guide turns `prompt-new.txt` into a concrete, copy‑and‑run implementation plan for the SafeBite Android client. It covers setup, features, UI (matching your images), testing, and delivery. Follow it linearly or per milestone.

Note: The client is Android‑only per scope in `prompt-new.txt`. iOS/Expo are out of scope.

---

### Milestone 0 — Prerequisites

- Install: Node 18+, Yarn/NPM, Android Studio (SDK API 34), JDK 17+.
- Accounts/keys ready:
  - Mapbox Downloads token + Access token
  - Google Places API key (Places, Geocoding enabled)
  - Firebase project (Auth: Email/Password, Firestore) + `google-services.json`

Deliverables:
- Mapbox tokens stored as environment variables.
- Firebase project with collections ready (see Data Model below).

---

### Milestone 1 — Project Setup (React Native Bare/TypeScript)

1) Initialize project

```bash
npx react-native@latest init safebite --template react-native-template-typescript
cd safebite
git init && git add . && git commit -m "chore: init RN TS project"
```

2) Install libraries

```bash
yarn add @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
yarn add react-native-elements react-native-vector-icons
yarn add @rnmapbox/maps
yarn add @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore
yarn add axios react-native-geolocation-service react-native-permissions @gorhom/bottom-sheet
yarn add @viro-community/react-viro
```

3) Android config

- `android/build.gradle`: compileSdk 34; add Mapbox maven with downloads token.
- `android/gradle.properties`: `MAPBOX_DOWNLOADS_TOKEN=...`
- `android/app/build.gradle`: apply `com.google.gms.google-services`.
- `android/app/`: place `google-services.json`.
- `AndroidManifest.xml`: INTERNET, FINE/COARSE LOCATION, CAMERA; optional ARCore `<uses-feature android:required="false" />`.
- `babel.config.js`: add `'react-native-reanimated/plugin'` last.

4) Environment variables (development)

Create `.env` (or use `react-native-config` if desired):

```
MAPBOX_ACCESS_TOKEN=...
GOOGLE_PLACES_API_KEY=...
```

---

### Milestone 2 — Data Model (Firestore)

- `users/{userId}`: `{ username, fullName, createdAt, preferences }`
- `crimeZones/{streetId}`:
  - `street_name: string`
  - `coordinates: GeoPoint[]` or `geoJsonPolygon`
  - `averageCrimeScore: number` (ACS)
  - `riskLevel: "low" | "high"`
  - `lastUpdated: Timestamp`

Seed Firestore with crime polygons for Butuan City. Keep read‑only access in client.

---

### Milestone 3 — App Skeleton & Navigation

- Create folders: `src/screens`, `src/components`, `src/lib`, `src/assets`.
- Add Navigation container with stack: `Login`, `Register`, `MainMap`, `ARView`.
- Theme tokens from the UI images:
  - Blue `#2F80ED`, Green `#4CAF50`, Danger `#D9534F`, Stop `#7B2B2B`, Card bg `#F5F5F5`, radius 12–16.

Deliverable: App launches to `Login`.

---

### Milestone 4 — Authentication (Login/Register)

- Match Figure 11 & 12 exactly:
  - `SafeBiteLogo` centered.
  - Card with inputs; blue primary button; green secondary for navigation between Login/Register.
- Use Firebase Auth (Email/Password). If you want username support, store mapping in Firestore and resolve to email.
- After sign‑in, navigate to `MainMap`.

Acceptance:
- Invalid creds show error.
- Success lands on Map screen.

---

### Milestone 5 — 2D Map Screen (Main Map)

UI to match Figure 13 & 14:

- Top search bar: placeholder “Search Dining”. Suggestions via Google Places Text Search/Autocomplete. Selecting a place drops a pin and fetches details.
- Map: `@rnmapbox/maps` with user location enabled.
- Right side square buttons: `AR`, `HM` (heatmap toggle).
- Bottom sheet/card: restaurant info (name, rating, price range, category, address, hours, cost/person, contact). Blue `Get Directions` button.
- While navigating: show dark‑red `Stop` button at bottom center.

Deliverables:
- Heatmap layer (toggled by `HM`) sourced from Firestore crime polygons.
- Selected restaurant shows a pin and opens info card.

---

### Milestone 6 — Crime‑Aware Routing

1) Fetch multiple candidate routes from Mapbox Directions (alternatives on).

2) Compute route exposure using ACS:

- Sample route polyline every ~5–10 m.
- For each sample point, check if it lies within any crime polygon.
- Add that polygon’s `averageCrimeScore` to the route’s cumulative exposure.
- Choose route with minimum exposure. Label as “Crime‑safe”. Display both (chosen in solid blue; alternative faded).

3) Performance:

- Query Firestore crime data with a bounding box buffered around the route to reduce downloads.
- Cache polygons locally during session.

Deliverables:
- Deterministic function `selectCrimeSafeRoute(candidates, crimePolygons): Route` with unit tests (see Testing section).

---

### Milestone 7 — Navigation Mode & Stop

- Start navigation after route selection.
- Track user location with `react-native-geolocation-service`.
- Keep camera centered; animate progress along the polyline.
- Show `Stop` to end; clearing route returns to browse mode.

---

### Milestone 8 — AR Navigation (ViroReact) + Fallback

- Detect ARCore availability. If available:
  - Show live camera feed, overlay polyline aligned with heading.
  - Street label along path; small `2D` button top‑right to return.
- If not available:
  - Show 2D full‑screen guidance: large arrow toward next segment, distance, step instructions.

Deliverables:
- Smooth switch between 2D map and AR view.

---

### Milestone 9 — Logout Confirmation

- Modal per Figure 15: “Are you sure?” with red `Yes` and green `No`.
- `Yes` => `auth().signOut()`; navigate to `Login`.

---

### Milestone 10 — Testing, QA, and Performance

- Unit tests (Jest) for routing exposure computation using mocked GeoJSON polygons.
- Smoke tests for auth flows and Places search.
- Validate heatmap visibility toggle.
- Battery/perf: stop geolocation and AR when navigation stops.

Example unit test outline (pseudo‑TS):

```ts
import { computeRouteExposure, selectCrimeSafeRoute } from "src/lib/crime";

it("prefers route avoiding high‑ACS polygon", () => {
  // mock two candidate routes and one high‑ACS polygon intersecting only route A
  // expect selectCrimeSafeRoute to pick route B
});
```

---

### UI Mapping (from your images)

- Login: Figure 11 — username, password, Login (blue), Register (green).
- Register: Figure 12 — full name, username/email, password, Submit (blue), Login (green).
- 2D Map: Figure 13 — Search bar, AR/HM buttons, Stop button while navigating, heatmap overlay.
- Restaurant Info: Figure 14 — sheet with details and Get Directions (blue).
- AR View: AR polyline overlay, `2D` toggle in corner.
- Logout: Figure 15 — Are you sure? Yes (red), No (green).

---

### Acceptance Checklist (features complete)

- [ ] Email/Password auth working; error states handled
- [ ] Places search with suggestions and details card
- [ ] Map shows user location + restaurant pins
- [ ] Heatmap toggle reads Firestore polygons and renders Mapbox heatmap
- [ ] Get Directions fetches alternatives
- [ ] Crime‑safe selection picks lowest exposure route
- [ ] Navigation mode with Stop control
- [ ] AR overlay view with 2D fallback
- [ ] Logout confirmation modal
- [ ] Basic unit tests for routing logic pass

---

### Delivery Artifacts

- Source code with structure:
  - `src/screens/{Login,Register,MainMap,ARView}`
  - `src/components/{SafeBiteLogo,RestaurantCard,HeatmapToggle,RoutePicker}`
  - `src/lib/{mapbox.ts,firebase.ts,places.ts,routing.ts,crime.ts}`
  - `README.md` including env vars and setup
- Recordings/screenshots of each screen matching the UI templates
- Test report (Jest) for routing/ACS logic

---

### Run Commands (summary)

```bash
# from project root
yarn android                 # run on device/emulator
cd android && ./gradlew assembleDebug  # build APK
```

If you want, I can scaffold the codebase with this structure and stub implementations next.


