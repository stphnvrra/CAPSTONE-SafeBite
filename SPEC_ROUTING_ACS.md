## Crime‑Aware Routing — Algorithm Spec

Goal: Given candidate Mapbox routes and Firestore crime polygons with `averageCrimeScore` (ACS), select the route with lowest exposure.

Inputs
- `routes: Route[]` — each with geometry polyline (GeoJSON LineString), distance, duration
- `polygons: Polygon[]` — GeoJSON polygons with `properties.averageCrimeScore`
- `sampleIntervalMeters` — default 7.5 m

Outputs
- `bestRoute: Route` — lowest exposure
- `exposureReport` — per route: `{ routeId, totalExposure, samplesInside, samplesTotal }`

Procedure
1. Preselect relevant polygons by building a bounding box around each route buffered by ~100 m.
2. Densify each route by sampling points along the LineString at `sampleIntervalMeters`.
3. For each sample point, run point‑in‑polygon against relevant polygons; if inside multiple polygons, sum their ACS.
4. Accumulate exposure per route:
   - `totalExposure += Σ(ACS(polygonsContainingPoint))`
5. Choose route with minimum `totalExposure`. Tie‑break by shorter duration.
6. Return `bestRoute` and an exposure breakdown for UI labels (e.g., “Crime‑safe”).

Complexity: O(R * (S * log P)) with spatial index; fine for city‑scale on device if you bound polygons by route bbox.

Testing
- Provide fixtures with two routes and a single high‑ACS polygon intersecting only one route: expect the other route to be chosen.
- Edge: No polygons ⇒ equal exposure ⇒ choose fastest.
- Edge: All samples outside polygons ⇒ exposure 0.


