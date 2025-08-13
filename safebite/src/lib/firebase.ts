import { getApps } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Call once at app start (auto-initialized by @react-native-firebase on RN CLI projects)
export function ensureFirebase(): any {
  const apps = getApps?.() ?? [];
  return apps[0];
}

export async function signInWithEmail(email: string, password: string) {
  await auth().signInWithEmailAndPassword(email, password);
}

export async function registerWithEmail(email: string, password: string, profile: { fullName?: string }) {
  const res = await auth().createUserWithEmailAndPassword(email, password);
  await firestore().collection('users').doc(res.user.uid).set({
    fullName: profile.fullName ?? '',
    email,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function signOut() {
  return auth().signOut();
}

export function getCurrentUser() {
  return auth().currentUser;
}

export async function fetchUserProfile(uid: string): Promise<{ fullName?: string; email?: string } | null> {
  const snap = await firestore().collection('users').doc(uid).get();
  return snap.exists ? ((snap.data() as any) ?? null) : null;
}

export type CrimeZone = {
  type: 'Feature';
  geometry: { type: 'Polygon'; coordinates: number[][][] };
  properties: { averageCrimeScore: number; street_name?: string; riskLevel?: string };
};

export async function fetchCrimeZones(): Promise<CrimeZone[]> {
  const snap = await firestore().collection('crimeZones').get();
  return snap.docs
    .map((d) => d.data() as any)
    .filter((d) => d && d.geoJsonPolygon)
    .map((d) => ({
      type: 'Feature',
      geometry: d.geoJsonPolygon,
      properties: { averageCrimeScore: Number(d.averageCrimeScore || 0), street_name: d.street_name, riskLevel: d.riskLevel },
    }));
}

export async function fetchCrimeZonesByBBox(minLon: number, minLat: number, maxLon: number, maxLat: number): Promise<CrimeZone[]> {
  // Firestore has no native geo-bbox query for polygons; this demo filters client-side after fetching.
  const all = await fetchCrimeZones();
  return all.filter((f) => {
    const coords = f.geometry.coordinates?.[0] || [];
    return coords.some(([lon, lat]: number[]) => lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat);
  });
}

// Placeholder wrappers for Firebase. Wire these to @react-native-firebase modules in the RN project.

export type AuthCredentials = { usernameOrEmail: string; password: string };

export async function signInWithCredentials(_: AuthCredentials): Promise<void> {
  // TODO: connect to firebase/auth
}

export async function registerUser(_: { fullName: string; username: string; password: string }): Promise<void> {
  // TODO: connect to firebase/auth and create users/{uid}
}

// ---- Username-first helpers ----
function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-');
}

function usernameToAuthEmail(username: string): string {
  const u = normalizeUsername(username);
  // Synthetic, app-scoped email for Firebase Auth
  return `${u}@user.safebite.local`;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
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
  // Create user profile
  await firestore().collection('users').doc(res.user.uid).set({
    username: uname,
    fullName: profile.fullName ?? '',
    email,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
  // Reserve username -> uid mapping
  await firestore().collection('usernames').doc(uname).set({ uid: res.user.uid, createdAt: firestore.FieldValue.serverTimestamp() });
}

export async function signInWithUsername(username: string, password: string) {
  const email = usernameToAuthEmail(username);
  await auth().signInWithEmailAndPassword(email, password);
}


