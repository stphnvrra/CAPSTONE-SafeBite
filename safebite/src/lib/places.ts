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
export function createSearchSessionToken(): string {
  // Generate a unique session token
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}



/**
 * Map Mapbox category to amenity type
 */
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
 * Search for dining establishments in Butuan City only using Mapbox Search Box API
 */
export async function searchPlaces(query: string, location?: LatLon, sessionToken?: string): Promise<PlaceSummary[]> {
  const searchQuery = (query || '').trim();
  if (!searchQuery) return [];

  console.log('🔍 Butuan City dining search for:', searchQuery);
  
  // Force location to be within Butuan City bounds
  const { lat, lon } = location || DEFAULT_CENTER;
  const butuanLat = Math.max(8.75, Math.min(9.05, lat));
  const butuanLon = Math.max(125.44, Math.min(125.64, lon));
  
  const session = sessionToken || createSearchSessionToken();
  
  try {
    // Step 1: Get suggestions using the Search Box API /suggest endpoint - Butuan only
    const suggestUrl = `${SEARCH_BOX_API_BASE}/suggest`;
    const suggestParams: any = {
        q: searchQuery,
        access_token: CONFIG.MAPBOX_ACCESS_TOKEN,
      session_token: session,
        language: 'en',
      limit: 15,
        types: 'poi',
      poi_category: 'restaurant,cafe,bar,pub,fast_food,food_court,bakery',
      country: 'ph',
      proximity: `${butuanLon},${butuanLat}`,
      bbox: '125.44,8.75,125.64,9.05', // Strict Butuan City bounds
    };

    console.log('📡 Calling Search Box API for Butuan dining establishments...');
    const suggestResponse = await axios.get(suggestUrl, { params: suggestParams });
    const suggestions = suggestResponse.data.suggestions || [];
    
    console.log(`📍 Got ${suggestions.length} Butuan dining suggestions`);

    if (suggestions.length === 0) {
      console.log('No dining establishments found in Butuan City');
      return [];
    }

    // Step 2: Retrieve full details for each suggestion within Butuan bounds
    const allResults: PlaceSummary[] = [];
    
    for (const suggestion of suggestions.slice(0, 10)) {
      try {
        const retrieveUrl = `${SEARCH_BOX_API_BASE}/retrieve/${suggestion.mapbox_id}`;
        const retrieveParams = {
          access_token: CONFIG.MAPBOX_ACCESS_TOKEN,
          session_token: session,
        };
        
        const retrieveResponse = await axios.get(retrieveUrl, { params: retrieveParams });
        const feature = retrieveResponse.data.features?.[0];
        
        if (feature && feature.geometry?.coordinates) {
          const [longitude, latitude] = feature.geometry.coordinates;
          
          // Verify location is within Butuan City bounds
          if (longitude >= 125.44 && longitude <= 125.64 && 
              latitude >= 8.75 && latitude <= 9.05) {
            
            const props = feature.properties || {};
            
            allResults.push({
              id: suggestion.mapbox_id || `mapbox_${longitude}_${latitude}`,
              name: props.name || suggestion.name || 'Dining Establishment',
              lat: latitude,
              lon: longitude,
              address: props.full_address || props.place_formatted || suggestion.place_formatted || undefined,
              cuisine: props.category || undefined,
              amenity: mapAmenityFromCategory(props.category),
            });
          } else {
            console.log(`Filtered out place outside Butuan: ${suggestion.name} at [${longitude}, ${latitude}]`);
          }
        }
      } catch (retrieveError) {
        console.error('Failed to retrieve details for suggestion:', suggestion.name, retrieveError);
      }
    }
    
    console.log(`✅ Found ${allResults.length} dining establishments in Butuan City`);
    return allResults;
    
  } catch (error) {
    console.error('❌ Search Box API search failed:', error);
    // Return empty array when Search Box API fails (no Geocoding API fallback)
    return [];
  }
}



/**
 * Get detailed restaurant information using Mapbox Search Box API
 */
export async function getPlaceDetails(placeId: string, sessionToken?: string): Promise<{
  phone?: string;
  address?: string;
  name?: string;
  location?: LatLon;
  website?: string;
  cuisine?: string;
  amenity?: string;
  openingHours?: string;
  description?: string;
  rating?: undefined;
  priceLevel?: undefined;
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
          
          // Format cuisine type from category
          let cuisineType = 'Filipino';
          const category = props.category || props.poi_category || '';
          if (category) {
            const cat = category.toLowerCase();
            if (cat.includes('chinese')) cuisineType = 'Chinese';
            else if (cat.includes('japanese')) cuisineType = 'Japanese';
            else if (cat.includes('korean')) cuisineType = 'Korean';
            else if (cat.includes('american')) cuisineType = 'American';
            else if (cat.includes('italian')) cuisineType = 'Italian';
            else if (cat.includes('pizza')) cuisineType = 'Pizza';
            else if (cat.includes('seafood')) cuisineType = 'Seafood';
            else if (cat.includes('barbecue') || cat.includes('bbq')) cuisineType = 'Barbecue';
            else if (cat.includes('cafe') || cat.includes('coffee')) cuisineType = 'Cafe';
            else if (cat.includes('fast_food')) cuisineType = 'Fast Food';
            else if (cat.includes('bar')) cuisineType = 'Bar & Grill';
            else if (cat.includes('bakery')) cuisineType = 'Bakery & Pastries';
          }
          
          // Get restaurant name and address from retrieve response
          const restaurantName = props.name || 'Restaurant';
          const restaurantAddress = props.full_address || props.place_formatted || 'Butuan City, Agusan del Norte';
          
          // Map amenity type
          const amenityType = mapAmenityFromCategory(props.category || props.poi_category);
          
          // Generate description
          const description = `${cuisineType} ${amenityType} located in Butuan City. Known for serving quality local and international dishes.`;
          
          console.log('✅ Retrieved restaurant details from Search Box API:', {
            name: restaurantName,
            address: restaurantAddress,
            category: props.category,
            poi_category: props.poi_category,
            coordinates: [lon, lat]
          });
          
          return {
            name: restaurantName,
            address: restaurantAddress,
            location: { lat, lon },
            cuisine: cuisineType,
            amenity: amenityType,
            phone: props.tel || props.phone || undefined,
            website: props.website || undefined,
            openingHours: props.hours || 'Contact restaurant for operating hours',
            description: description,
            rating: undefined,
            priceLevel: undefined,
          };
        } else {
          console.log('Restaurant location outside Butuan City bounds');
          return {
            name: 'Restaurant',
            address: 'Location outside Butuan City',
            location: DEFAULT_CENTER,
            amenity: 'restaurant',
            cuisine: 'Filipino',
            description: 'This location is outside the service area',
            openingHours: 'Contact for hours',
          };
        }
      }
    }
    
    // Fallback for legacy IDs or if retrieve fails
    console.log('⚠️ Using fallback restaurant details');
    return {
      name: 'Restaurant',
      address: 'Butuan City, Agusan del Norte',
      location: DEFAULT_CENTER,
      amenity: 'restaurant',
      cuisine: 'Filipino',
      description: 'Local dining establishment in Butuan City serving authentic Filipino cuisine',
      openingHours: 'Contact restaurant for operating hours',
      phone: undefined,
      website: undefined,
    };
    
  } catch (error) {
    console.error('❌ Failed to get Search Box API place details:', error);
    
    return {
      name: 'Restaurant',
      address: 'Butuan City, Agusan del Norte',
      location: DEFAULT_CENTER,
      amenity: 'restaurant',
      cuisine: 'Filipino',
      description: 'Local dining establishment in Butuan City serving authentic Filipino cuisine',
      openingHours: 'Contact restaurant for operating hours',
      phone: undefined,
      website: undefined,
    };
  }
}

/**
 * Get autocomplete suggestions using Mapbox Search Box API
 */
export async function autocomplete(query: string, location?: LatLon, sessionToken?: string): Promise<Array<{ id: string; description: string }>> {
  if (!query || query.length < 2) return [];
  
  console.log('🔍 Search Box API autocomplete for:', query);
  const session = sessionToken || createSearchSessionToken();
  
  try {
    // Use Search Box API suggest endpoint for autocomplete
    const suggestUrl = `${SEARCH_BOX_API_BASE}/suggest`;
    const params: any = {
      q: query,
      access_token: CONFIG.MAPBOX_ACCESS_TOKEN,
      session_token: session,
      language: 'en',
      limit: 5,
      types: 'poi,address',
      poi_category: 'restaurant,cafe,bar,pub,fast_food,food_court',
    };
    
    if (location) {
      params.proximity = `${location.lon},${location.lat}`;
    }
    
    const { data } = await axios.get(suggestUrl, { params });
    const suggestions = data.suggestions || [];
    
    console.log('✅ Search Box API found:', suggestions.length, 'suggestions');
    
    return suggestions.slice(0, 5).map((suggestion: any) => ({
      id: suggestion.mapbox_id,
      description: suggestion.name + (suggestion.place_formatted ? `, ${suggestion.place_formatted}` : ''),
    }));
  } catch (error) {
    console.error('❌ Search Box API autocomplete failed:', error);
    return [];
  }
}




