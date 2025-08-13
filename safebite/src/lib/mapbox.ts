import { CONFIG } from '../config/env';
import type { Coordinate } from './crime';

export type DirectionsRoute = {
  id: string;
  geometry: { type: 'LineString'; coordinates: Coordinate[] };
  durationSeconds: number;
};

// Calls Mapbox Directions API for two-point routing with alternatives and GeoJSON geometry
export async function fetchDirectionsAlternatives(
  origin: Coordinate,
  destination: Coordinate
): Promise<DirectionsRoute[]> {
  const profile = 'driving';
  const base = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
  const url = `${base}?alternatives=true&geometries=geojson&overview=full&access_token=${CONFIG.MAPBOX_ACCESS_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Directions request failed: ${res.status}`);
  }
  const data = await res.json();
  const routes = Array.isArray(data?.routes) ? data.routes : [];
  return routes.map((r: any, idx: number) => ({
    id: String(idx),
    geometry: r.geometry,
    durationSeconds: Math.round(Number(r.duration ?? 0)),
  }));
}


