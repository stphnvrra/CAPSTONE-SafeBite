import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';

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

export async function ensureCameraPermission(): Promise<boolean> {
  const perm = Platform.select({
    android: PERMISSIONS.ANDROID.CAMERA,
    ios: PERMISSIONS.IOS.CAMERA,
    default: PERMISSIONS.ANDROID.CAMERA,
  }) as any;
  const status = await check(perm);
  if (status === RESULTS.GRANTED) return true;
  const req = await request(perm);
  if (req === RESULTS.GRANTED) return true;
  if (req === RESULTS.BLOCKED) await openSettings();
  return false;
}


