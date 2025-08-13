SafeBite (Client) — Capstone Starter

This repository contains planning artifacts to build the SafeBite Android client app following `prompt-new.txt` and your UI images.

Key docs:
- `CAPSTONE_STEP_BY_STEP.md` — end‑to‑end build guide and milestones
- `SPEC_ROUTING_ACS.md` — crime‑aware routing algorithm spec
- `TEST_PLAN.md` — test strategy and cases
- `FEATURE_CHECKLIST.md` — definition of done per feature

Environment variables (development):

```
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
MAPBOX_DOWNLOADS_TOKEN=your_mapbox_downloads_token
GOOGLE_PLACES_API_KEY=your_google_places_key
```

Firebase setup (Android):
- Create project; enable Auth (Email/Password) and Firestore
- Download `google-services.json` to `android/app/` (in the actual RN project)
- Collections:
  - `users/{userId}`
  - `crimeZones/{streetId}` with fields per `CAPSTONE_STEP_BY_STEP.md`

Run (after scaffolding RN project):

```
yarn android
cd android && ./gradlew assembleDebug
```

Need code scaffolding? Ask: “Generate starter project (TypeScript)”.


