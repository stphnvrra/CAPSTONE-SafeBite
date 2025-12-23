// Mapbox Search Box helpers for dining search, details, and autocomplete in Butuan City
import axios from 'axios';
import { CONFIG } from '../config/env';

export type PlaceSummary = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  cuisine?: string;
  amenity?: string;
  rating?: undefined;
  priceRange?: undefined;
};

export type LatLon = { lat: number; lon: number };

// Default center coordinates (Butuan City - used as fallback for proximity)
const DEFAULT_CENTER: LatLon = { lat: 8.947200, lon: 125.543061 };

// Mapbox Search Box API base URL
const SEARCH_BOX_API_BASE = 'https://api.mapbox.com/search/searchbox/v1';

/**
 * Generate a session token for Mapbox Search Box API
 */
// Generates a lightweight unique token for grouping Search Box API requests
export function createSearchSessionToken(): string {
  // Generate a unique session token
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}



/**
 * Map Mapbox category to amenity type
 */
// Maps a category string from Mapbox results to an OSM-like amenity value
function mapAmenityFromCategory(category?: string): string {
  if (!category) return 'restaurant';
  
  const cat = category.toLowerCase();
  
  if (cat.includes('cafe') || cat.includes('coffee')) return 'cafe';
  if (cat.includes('fast') || cat.includes('quick')) return 'fast_food';
  if (cat.includes('bar') || cat.includes('pub')) return 'bar';
  if (cat.includes('bakery')) return 'bakery';
  
  return 'restaurant';
}




/**
 * Get detailed restaurant information using Mapbox Search Box API
 */
// Retrieves minimal restaurant information for a suggestion id (name, address, amenity)
export async function getPlaceDetails(placeId: string, sessionToken?: string): Promise<{
  name?: string;
  address?: string;
  amenity?: string;
}> {
  console.log('🔍 Getting detailed restaurant info using Search Box API for:', placeId);
  
  try {
    // Use Search Box API retrieve method for all place details
    if (placeId.startsWith('poi.') || placeId.startsWith('address.')) {
      const session = sessionToken || createSearchSessionToken();
      const retrieveUrl = `${SEARCH_BOX_API_BASE}/retrieve/${placeId}`;
      const params = {
        access_token: CONFIG.MAPBOX_ACCESS_TOKEN,
        session_token: session,
      };
      
      console.log('📡 Using Search Box API retrieve method for restaurant details...');
      const { data } = await axios.get(retrieveUrl, { params });
      const feature = data.features?.[0];
      
      if (feature && feature.geometry?.coordinates) {
        const [lon, lat] = feature.geometry.coordinates;
        const props = feature.properties || {};
        
        // Verify location is within Butuan City bounds
        if (lon >= 125.44 && lon <= 125.64 && lat >= 8.75 && lat <= 9.05) {
          
          // Get restaurant name and address from retrieve response
          const restaurantName = props.name || 'Restaurant';
          const restaurantAddress = props.full_address || props.place_formatted || 'Butuan City, Agusan del Norte';
          
          // Map amenity type
          const amenityType = mapAmenityFromCategory(props.category || props.poi_category);
          
          console.log('✅ Retrieved restaurant details from Search Box API:', {
            name: restaurantName,
            address: restaurantAddress,
            category: props.category
          });
          
          return {
            name: restaurantName,
            address: restaurantAddress,
            amenity: amenityType,
          };
        } else {
          console.log('Restaurant location outside Butuan City bounds');
          return {
            name: 'Restaurant',
            address: 'Location outside Butuan City',
            amenity: 'restaurant',
          };
        }
      }
    }
    
    // Fallback for legacy IDs or if retrieve fails
    console.log('⚠️ Using fallback restaurant details');
    return {
      name: 'Restaurant',
      address: 'Butuan City, Agusan del Norte',
      amenity: 'restaurant',
    };
    
  } catch (error) {
    console.error('❌ Failed to get Search Box API place details:', error);
    
    return {
      name: 'Restaurant',
      address: 'Butuan City, Agusan del Norte',
      amenity: 'restaurant',
    };
  }
}





