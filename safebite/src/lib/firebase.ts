// Firebase helpers for auth, Firestore access, and crime zone data formatting
import { getApps, initializeApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Initializes Firebase app instance if not already created and returns the active app
export function ensureFirebase(): any {
  const apps = getApps?.() ?? [];
  if (!apps.length) {
    try {
      (initializeApp as any)();
    } catch (_e) {
      // no-op if already initialized or auto-init occurs
    }
  }
  return (getApps?.() ?? [])[0];
}

export async function signOut() {
  // Signs out the current authenticated user
  return auth().signOut();
}

export function getCurrentUser() {
  // Returns the current authenticated Firebase user or null
  return auth().currentUser;
}

export type GeoJsonPolygonLike = { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] };

export type CrimeZone = {
  type: 'Feature';
  geometry: GeoJsonPolygonLike;
  properties: { averageCrimeScore: number; street_name?: string; riskLevel?: string };
};


// Parses common GeoJSON wrappers and returns a normalized Polygon or MultiPolygon
function normalizeGeoJsonPolygon(input: any): GeoJsonPolygonLike | null {
  try {
    const value = typeof input === 'string' ? JSON.parse(input) : input;
    if (!value) return null;
    // Accept Feature wrapper
    if (value.type === 'Feature' && value.geometry) {
      return normalizeGeoJsonPolygon(value.geometry);
    }
    // Accept FeatureCollection wrapper (use first feature)
    if (value.type === 'FeatureCollection' && Array.isArray(value.features) && value.features.length > 0) {
      return normalizeGeoJsonPolygon(value.features[0]?.geometry);
    }
    if (value.type === 'Polygon' && Array.isArray(value.coordinates)) {
      const coords = value.coordinates;
      // Ensure coordinates shape is array of rings -> array of positions
      if (!Array.isArray(coords) || !Array.isArray(coords[0])) return null;
      return { type: 'Polygon', coordinates: coords } as GeoJsonPolygonLike;
    }
    if (value.type === 'MultiPolygon' && Array.isArray(value.coordinates)) {
      const coords = value.coordinates;
      if (!Array.isArray(coords) || !Array.isArray(coords[0])) return null;
      return { type: 'MultiPolygon', coordinates: coords } as GeoJsonPolygonLike;
    }
    return null;
  } catch (_e) {
    return null;
  }
}

export async function fetchCrimeZones(): Promise<CrimeZone[]> {
  // Retrieves all crime zone documents and maps them to GeoJSON features
  const snap = await firestore().collection('crimeZones').get();
  return snap.docs
    .map((d) => d.data() as any)
    .map((d) => ({ data: d, geometry: normalizeGeoJsonPolygon(d?.geoJsonPolygon) }))
    .filter((x) => !!x.geometry)
    .map((x) => ({
      type: 'Feature',
      geometry: x.geometry as GeoJsonPolygonLike,
      properties: { averageCrimeScore: Number(x.data?.averageCrimeScore || 0), street_name: x.data?.street_name, riskLevel: x.data?.riskLevel },
    }));
}

export async function fetchCrimeZonesByBBox(minLon: number, minLat: number, maxLon: number, maxLat: number): Promise<CrimeZone[]> {
  // Filters crime zones client-side by bounding box due to lack of polygon geo queries
  const all = await fetchCrimeZones();
  return all.filter((f) => {
    const rings: number[][] = [];
    if (f.geometry.type === 'Polygon') {
      const poly = f.geometry.coordinates as number[][][];
      for (const ring of poly) rings.push(...ring);
    } else if (f.geometry.type === 'MultiPolygon') {
      const mpoly = f.geometry.coordinates as number[][][][];
      for (const poly of mpoly) {
        for (const ring of poly) rings.push(...ring);
      }
    }
    return rings.some((pos) => Array.isArray(pos) && pos.length >= 2 && pos[0] >= minLon && pos[0] <= maxLon && pos[1] >= minLat && pos[1] <= maxLat);
  });
}


// ---- Username-first helpers ----
// Sanitizes a username to a lowercase, app-safe identifier used across features
function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-');
}

// Converts a username into an app-scoped synthetic email for Firebase Auth
function usernameToAuthEmail(username: string): string {
  const u = normalizeUsername(username);
  // Synthetic, app-scoped email for Firebase Auth
  return `${u}@user.safebite.local`;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  // Checks if usernames/{username} mapping exists to prevent duplicates
  const doc = await firestore().collection('usernames').doc(normalizeUsername(username)).get();
  // @react-native-firebase types may expose `exists` as a function or boolean depending on version
  const exists = typeof (doc as any).exists === 'function' ? (doc as any).exists() : (doc as any).exists;
  return !!exists;
}

export async function registerWithUsername(username: string, password: string, profile: { fullName?: string }) {
  const uname = normalizeUsername(username);
  const taken = await isUsernameTaken(uname);
  if (taken) {
    throw new Error('Username is already taken');
  }
  const email = usernameToAuthEmail(uname);
  const res = await auth().createUserWithEmailAndPassword(email, password);
  
  // Add small delay to ensure auth state propagates to Firestore
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Create user profile with retry logic
  try {
    await firestore().collection('users').doc(res.user.uid).set({
      username: uname,
      fullName: profile.fullName ?? '',
      email,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    // Retry once after delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    await firestore().collection('users').doc(res.user.uid).set({
      username: uname,
      fullName: profile.fullName ?? '',
      email,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  }
  
  // Reserve username -> uid mapping
  await firestore().collection('usernames').doc(uname).set({ 
    uid: res.user.uid, 
    createdAt: firestore.FieldValue.serverTimestamp() 
  });
}

export async function signInWithUsername(username: string, password: string) {
  // Authenticates using the username-based synthetic email format
  const email = usernameToAuthEmail(username);
  await auth().signInWithEmailAndPassword(email, password);
}


