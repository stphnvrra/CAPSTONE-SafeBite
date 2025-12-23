// Permission helpers for requesting location and camera access at runtime
import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';

// Requests runtime location permission if needed and returns whether granted
export async function ensureLocationPermission(): Promise<boolean> {
  const perm = Platform.select({
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    default: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  }) as any;
  const status = await check(perm);
  if (status === RESULTS.GRANTED) return true;
  const req = await request(perm);
  if (req === RESULTS.GRANTED) return true;
  // Optionally prompt settings for blocked
  if (req === RESULTS.BLOCKED) await openSettings();
  return false;
}


