export type Coordinate = [number, number];
export type LineString = { type: 'LineString'; coordinates: Coordinate[] };
export type Polygon = { type: 'Polygon'; coordinates: Coordinate[][]; properties?: { averageCrimeScore?: number } };
export type RouteCandidate = { id: string; geometry: LineString; durationSeconds?: number };
export type ExposureReport = { routeId: string; totalExposure: number; samplesInside: number; samplesTotal: number };

function isPointInsidePolygon(point: Coordinate, polygon: Polygon): boolean {
  const [x, y] = point;
  const ring = polygon.coordinates[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function sampleLineString(line: LineString, intervalMeters = 7.5): Coordinate[] {
  const result: Coordinate[] = [];
  let carry = 0;
  for (let i = 1; i < line.coordinates.length; i++) {
    const a = line.coordinates[i - 1];
    const b = line.coordinates[i];
    const segmentMeters = haversineMeters(a, b);
    let dist = carry;
    while (dist + intervalMeters <= segmentMeters) {
      const t = (dist + intervalMeters) / segmentMeters;
      result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      dist += intervalMeters;
    }
    carry = segmentMeters - dist;
  }
  return result;
}

// Computes cumulative exposure of a route by summing polygon scores over sampled points
export function computeRouteExposure(route: RouteCandidate, polygons: Polygon[], intervalMeters = 7.5): ExposureReport {
  const samples = sampleLineString(route.geometry, intervalMeters);
  let total = 0;
  let inside = 0;
  for (const p of samples) {
    let e = 0;
    for (const poly of polygons) {
      if (isPointInsidePolygon(p, poly)) {
        inside++;
        e += poly.properties?.averageCrimeScore ?? 0;
      }
    }
    total += e;
  }
  return { routeId: route.id, totalExposure: total, samplesInside: inside, samplesTotal: samples.length };
}

// Selects the lowest-exposure route with duration as a tiebreaker among candidates
export function selectCrimeSafeRoute(candidates: RouteCandidate[], polygons: Polygon[]) {
  const reports = candidates.map((c) => computeRouteExposure(c, polygons));
  reports.sort((a, b) => a.totalExposure - b.totalExposure || (getDuration(a.routeId, candidates) - getDuration(b.routeId, candidates)));
  const best = candidates.find((c) => c.id === reports[0].routeId)!;
  return { best, reports };
}

// Returns duration in seconds for the route id from a list or +Infinity if missing
function getDuration(routeId: string, list: RouteCandidate[]): number {
  return list.find((r) => r.id === routeId)?.durationSeconds ?? Number.POSITIVE_INFINITY;
}

// Calculates great-circle distance in meters between two lon/lat points
function haversineMeters(a: Coordinate, b: Coordinate): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// --- High-risk avoidance helpers ---

/**
 * Returns true if any sampled point along the route lies inside any of the provided polygons.
 * Intended for strict avoidance checks (e.g., high-risk areas).
 */
export function routeIntersectsAnyPolygon(
  route: RouteCandidate,
  polygons: Polygon[],
  options?: { intervalMeters?: number; bufferMeters?: number }
): boolean {
  if (!polygons.length) return false;
  const intervalMeters = options?.intervalMeters ?? 2.0; // dense sampling for strict checks
  const bufferMeters = options?.bufferMeters ?? 4.0; // treat near-edge as intersection
  const samples = sampleLineString(route.geometry, intervalMeters);
  for (const p of samples) {
    for (const poly of polygons) {
      if (isPointInsidePolygon(p, poly)) return true;
      if (bufferMeters > 0 && pointToPolygonEdgeDistanceMeters(p, poly) <= bufferMeters) return true;
    }
  }
  return false;
}

/**
 * Converts mixed Firestore GeoJSON features into a flat array of simple Polygons
 * and separates those tagged as high risk.
 */
export function normalizeFirestoreCrimeFeatures(features: Array<any>): { all: Polygon[]; highRisk: Polygon[] } {
  const all: Polygon[] = [];
  const highRisk: Polygon[] = [];

  const pushPoly = (coords: any, props: any) => {
    const polygon: Polygon = { type: 'Polygon', coordinates: coords as Coordinate[][], properties: { averageCrimeScore: Number(props?.averageCrimeScore ?? 0) } };
    all.push(polygon);
    const riskLevel = String(props?.riskLevel || '').toLowerCase();
    if (riskLevel === 'high') highRisk.push(polygon);
  };

  for (const f of features || []) {
    const g = f?.geometry;
    if (!g || !g.type || !g.coordinates) continue;
    if (g.type === 'Polygon') {
      pushPoly(g.coordinates, f.properties);
    } else if (g.type === 'MultiPolygon') {
      const mcoords = g.coordinates as any[];
      for (const poly of mcoords) pushPoly(poly, f.properties);
    }
  }

  return { all, highRisk };
}

/** Returns first high-risk polygon intersecting the route, or null if none. */
export function getFirstIntersectingPolygon(route: RouteCandidate, polygons: Polygon[], intervalMeters = 7.5): Polygon | null {
  if (!polygons.length) return null;
  const samples = sampleLineString(route.geometry, intervalMeters);
  for (const p of samples) {
    for (const poly of polygons) {
      if (isPointInsidePolygon(p, poly)) return poly;
    }
  }
  return null;
}

/** Compute bounding box of a polygon's outer ring. */
export function polygonBoundingBox(polygon: Polygon): { minLon: number; minLat: number; maxLon: number; maxLat: number } {
  const ring = polygon.coordinates[0] || [];
  let minLon = Number.POSITIVE_INFINITY, minLat = Number.POSITIVE_INFINITY,
      maxLon = Number.NEGATIVE_INFINITY, maxLat = Number.NEGATIVE_INFINITY;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLon, minLat, maxLon, maxLat };
}

/**
 * Generate simple detour waypoint candidates positioned just outside the polygon bbox
 * in the four cardinal directions. Margin is in meters.
 */
export function detourWaypointsAroundPolygon(polygon: Polygon, marginMeters = 80): Coordinate[] {
  const { minLon, minLat, maxLon, maxLat } = polygonBoundingBox(polygon);
  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;
  // Rough degree offsets from meters
  const metersPerDegLat = 111320;
  const metersPerDegLon = Math.cos((centerLat * Math.PI) / 180) * 111320;
  const dLat = marginMeters / metersPerDegLat;
  const dLon = marginMeters / metersPerDegLon;
  return [
    [minLon - dLon, centerLat], // west
    [maxLon + dLon, centerLat], // east
    [centerLon, minLat - dLat], // south
    [centerLon, maxLat + dLat], // north
  ];
}

// --- Geometry helpers ---

/** Minimum distance from point to any edge of polygon in meters (outer ring only). */
export function pointToPolygonEdgeDistanceMeters(point: Coordinate, polygon: Polygon): number {
  const ring = polygon.coordinates[0] || [];
  if (ring.length < 2) return Number.POSITIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const d = pointToSegmentDistanceMeters(point, a, b);
    if (d < min) min = d;
  }
  return min;
}

function pointToSegmentDistanceMeters(p: Coordinate, a: Coordinate, b: Coordinate): number {
  // Convert lon/lat to local meters using equirectangular approximation
  const refLat = ((a[1] + b[1]) / 2) * Math.PI / 180;
  const metersPerDegLat = 111320;
  const metersPerDegLon = Math.cos(refLat) * 111320;
  const toXY = (c: Coordinate) => ({ x: c[0] * metersPerDegLon, y: c[1] * metersPerDegLat });
  const P = toXY(p);
  const A = toXY(a);
  const B = toXY(b);
  const ABx = B.x - A.x;
  const ABy = B.y - A.y;
  const APx = P.x - A.x;
  const APy = P.y - A.y;
  const ab2 = ABx * ABx + ABy * ABy;
  const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (APx * ABx + APy * ABy) / ab2));
  const projx = A.x + ABx * t;
  const projy = A.y + ABy * t;
  const dx = P.x - projx;
  const dy = P.y - projy;
  return Math.sqrt(dx * dx + dy * dy);
}


