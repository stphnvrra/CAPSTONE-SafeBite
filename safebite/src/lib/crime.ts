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

export function selectCrimeSafeRoute(candidates: RouteCandidate[], polygons: Polygon[]) {
  const reports = candidates.map((c) => computeRouteExposure(c, polygons));
  reports.sort((a, b) => a.totalExposure - b.totalExposure || (getDuration(a.routeId, candidates) - getDuration(b.routeId, candidates)));
  const best = candidates.find((c) => c.id === reports[0].routeId)!;
  return { best, reports };
}

function getDuration(routeId: string, list: RouteCandidate[]): number {
  return list.find((r) => r.id === routeId)?.durationSeconds ?? Number.POSITIVE_INFINITY;
}

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


