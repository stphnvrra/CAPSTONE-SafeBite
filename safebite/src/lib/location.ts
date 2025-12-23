// Location utilities to get current position and watch continuous updates
import Geolocation from 'react-native-geolocation-service';

// Retrieves current device GPS position once as a promise
export function getCurrentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  });
}

export type LocationCallback = (pos: { lat: number; lon: number }) => void;

/**
 * Watch device location and invoke the callback on updates. Returns a cleanup function.
 */
// Starts a high-accuracy location watch and returns a disposer to stop updates
export function watchPosition(callback: LocationCallback) {
  const id = Geolocation.watchPosition(
    (pos) => {
      if (pos?.coords) {
        callback({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      }
    },
    (_err) => {},
    { enableHighAccuracy: true, distanceFilter: 2, interval: 1000, fastestInterval: 750 }
  );
  return () => {
    if (typeof id === 'number') {
      Geolocation.clearWatch(id);
    } else if (id && 'remove' in (id as any)) {
      try { (id as any).remove(); } catch {}
    }
  };
}


