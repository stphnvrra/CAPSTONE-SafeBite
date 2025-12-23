// General-purpose utilities: debounce/throttle, distance calc, bounds check, and address formatting

/**
 * Debounce function to limit the rate of function calls
 * @param func Function to debounce
 * @param wait Delay in milliseconds
 * @param immediate Trigger on leading edge instead of trailing
 * @returns Debounced function
 */
// Returns a debounced wrapper that delays invoking until wait has elapsed
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle function to limit function calls to once per specified time period
 * @param func Function to throttle
 * @param limit Time limit in milliseconds
 * @returns Throttled function
 */
// Returns a throttled wrapper that limits invocations to at most once per period
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
// Computes great-circle distance in kilometers between two coordinates
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a coordinate is within the Butuan City bounds
 * @param lat Latitude
 * @param lon Longitude
 * @returns true if within bounds
 */
// Checks whether a coordinate lies within the configured Butuan City bounding box
export function isWithinButuanBounds(lat: number, lon: number): boolean {
  const BUTUAN_BOUNDS = {
    minLon: 125.44627456871875,
    minLat: 8.750235457081931,
    maxLon: 125.63672866987403,
    maxLat: 9.051031758534917
  };
  
  return (
    lat >= BUTUAN_BOUNDS.minLat &&
    lat <= BUTUAN_BOUNDS.maxLat &&
    lon >= BUTUAN_BOUNDS.minLon &&
    lon <= BUTUAN_BOUNDS.maxLon
  );
}

/**
 * Format address for display
 * @param address Raw address string
 * @returns Formatted address
 */
// Normalizes and shortens a raw address string for UI display
export function formatAddress(address?: string): string {
  if (!address) return 'Butuan City';
  
  // Remove redundant text and clean up
  const cleaned = address
    .replace(/,\s*Philippines?/gi, '')
    .replace(/,\s*Butuan City,?\s*/gi, ', ')
    .replace(/,\s*Agusan del Norte,?\s*/gi, ', ')
    .replace(/,\s+/g, ', ')
    .replace(/^,\s*/, '')
    .replace(/,\s*$/, '')
    .trim();
    
  return cleaned || 'Butuan City';
}
