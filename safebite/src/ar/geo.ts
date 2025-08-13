// Simple local tangent plane conversions (approximate) for short distances

const R = 6378137; // Earth radius in meters (WGS84)

export function latLonToENU(
  origin: { lat: number; lon: number },
  point: { lat: number; lon: number }
): { east: number; north: number } {
  const dLat = toRad(point.lat - origin.lat);
  const dLon = toRad(point.lon - origin.lon);
  const lat = toRad((origin.lat + point.lat) / 2);
  const east = R * dLon * Math.cos(lat);
  const north = R * dLat;
  return { east, north };
}

export function toRad(v: number) { return (v * Math.PI) / 180; }


