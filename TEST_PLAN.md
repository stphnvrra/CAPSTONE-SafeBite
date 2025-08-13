## Test Plan — SafeBite Client

Scope focuses on client features defined in `prompt-new.txt`.

Test Types
- Unit: routing exposure functions, utilities
- Integration: Firebase auth, Places search, Map rendering, Heatmap toggle
- Device/UX: AR availability and fallback, navigation updates, permissions flows

Environments
- Android 8+ physical device (ARCore capable) and emulator (no AR)

Key Cases
1. Auth
   - Invalid credentials show error
   - New account registers and creates Firestore user doc
   - Logout modal flow returns to Login
2. Map & Search
   - Search suggestions appear with network on
   - Selecting a suggestion drops a pin and opens card
3. Heatmap
   - Toggle shows/hides layer
   - Missing Firestore permissions handled gracefully
4. Routing
   - When alternatives returned, lowest exposure route is selected
   - No polygons ⇒ fastest route is chosen
5. Navigation
   - GPS off ⇒ friendly prompt and disabled navigation
   - Stop button halts tracking
6. AR
   - ARCore supported ⇒ AR overlay screen opens
   - Not supported ⇒ 2D fallback appears

Artifacts
- Jest test results for routing
- Screen recordings per feature


