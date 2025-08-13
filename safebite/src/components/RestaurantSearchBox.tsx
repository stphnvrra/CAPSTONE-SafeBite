import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { CONFIG } from '../config/env';
import { debounce } from '../lib/utils';
import { createSearchSessionToken } from '../lib/places';

// No geographic restrictions - search worldwide

interface SearchResult {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
  properties?: any;
  place_type?: string[];
}

interface Suggestion {
  id: string;
  description: string;
  name: string;
  address?: string;
  coordinates: [number, number];
}

interface PlaceResult {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  cuisine?: string;
  amenity?: string;
  coordinates: [number, number];
}

interface SearchBoxOptions {
  types?: string;
  proximity?: [number, number];
  bbox?: string;
  country?: string;
  language?: string;
  limit?: number;
  marker?: boolean;
  allowReverse?: boolean;
  sessionToken?: string;
}

interface RestaurantSearchBoxProps {
  onPlaceSelect: (place: PlaceResult) => void;
  onSearchFocus?: () => void;
  onSearchBlur?: () => void;
  placeholder?: string;
  center: [number, number]; // [lon, lat] for Butuan City center
  accessToken: string;
  options?: SearchBoxOptions;
  onReverseGeocode?: (coordinates: [number, number]) => void;
}

/**
 * Enhanced Mapbox Search Box for React Native
 * 
 * Implements functionality similar to the HTML Mapbox Search Box:
 * - Configurable search options (types, proximity, bbox, country, etc.)
 * - POI-first search strategy
 * - Reverse geocoding on map clicks (allowReverse option)
 * - Autocomplete functionality
 * - Smart search: local Butuan priority + worldwide capability
 * 
 * Usage example (similar to HTML):
 * ```jsx
 * const searchBoxRef = useRef<SearchBoxRef>(null);
 * 
 * <RestaurantSearchBox
 *   ref={searchBoxRef}
 *   accessToken="YOUR_ACCESS_TOKEN"
 *   options={{
 *     types: 'poi,address',
 *     proximity: [125.543061, 8.947200], // Butuan City center (optional)
 *     bbox: '125.4,8.8,125.7,9.1', // Restrict to area (optional)
 *     country: 'ph', // Restrict to country (optional)
 *     marker: true,
 *     allowReverse: true
 *   }}
 *   onPlaceSelect={(place) => console.log('Selected:', place)}
 * />
 * ```
 */
export interface SearchBoxRef {
  reverseGeocode: (coordinates: [number, number]) => Promise<PlaceResult | null>;
  performSearch: (query: string) => Promise<void>;
}

const RestaurantSearchBox = forwardRef<SearchBoxRef, RestaurantSearchBoxProps>(({
  onPlaceSelect,
  onSearchFocus,
  onSearchBlur,
  placeholder = "Search places (local Butuan + worldwide)",
  center,
  accessToken,
  options = {
    types: 'poi,address',
    proximity: center,
    language: 'en',
    limit: 10,
    marker: true,
    allowReverse: true,
    sessionToken: undefined,
  },
  onReverseGeocode,
}, ref) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<number | undefined>(undefined);
  const sessionToken = useRef<string>(options.sessionToken || createSearchSessionToken());

  // Smart search function: local Butuan search + worldwide capability
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Search Box API search:', searchQuery);
      
      // Use Mapbox Search Box API
      const baseUrl = 'https://api.mapbox.com/search/searchbox/v1/suggest';
      const proximity = options.proximity || center;
      
      const params: any = {
        q: searchQuery,
        access_token: accessToken,
        session_token: sessionToken.current,
        language: options.language || 'en',
        limit: options.limit || 10,
        types: options.types || 'poi,address',
      };

      // Add proximity for relevance
          if (proximity && proximity.length === 2) {
        params.proximity = `${proximity[0]},${proximity[1]}`;
      }

      // Always restrict to Butuan City bounds for dining establishments
      params.bbox = '125.44,8.75,125.64,9.05'; // Strict Butuan City bounds
      params.country = 'ph'; // Philippines only
      
      // Dining establishment categories only
      params.poi_category = 'restaurant,cafe,bar,pub,fast_food,food_court,bakery,eatery';

      console.log('📡 Calling Search Box API /suggest endpoint...');
      const response = await fetch(`${baseUrl}?${new URLSearchParams(params).toString()}`);
      const data = await response.json();
      
      const suggestions = data.suggestions || [];
      console.log(`📍 Got ${suggestions.length} suggestions`);
      
      // Convert to our format - NOTE: suggestions DON'T contain coordinates
      const formattedSuggestions: Suggestion[] = suggestions.slice(0, 8).map((suggestion: any) => {
        const placeName = suggestion.name || suggestion.text || 'Restaurant';
        const placeAddress = suggestion.place_formatted || suggestion.full_address || 'Butuan City';
        
        console.log('🔍 Formatting Search Box API suggestion:', {
          id: suggestion.mapbox_id || suggestion.id,
          name: placeName,
          address: placeAddress,
          suggestion_type: suggestion.suggestion_type,
          originalSuggestion: suggestion
        });
        
        return {
          id: suggestion.mapbox_id || suggestion.id,
          description: placeAddress,
          name: placeName,
          address: placeAddress,
          coordinates: [0, 0], // No coordinates from /suggest - get from /retrieve
        };
      });

      setSuggestions(formattedSuggestions);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('❌ Mapbox search failed:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [center, accessToken, options]);

  // Create debounced search function without useCallback to avoid linting issues
  const debouncedSearch = debounce(performSearch, 300);

  // Reverse geocoding function - disabled when using Search Box API only
  const reverseGeocode = useCallback(async (coordinates: [number, number]) => {
    // Not implemented with Search Box API only
    console.log('⚠️ Reverse geocoding not available with Search Box API only');
    return null;
  }, []);

  // Expose functions to parent component (similar to HTML example's searchBox methods)
  useImperativeHandle(ref, () => ({
    reverseGeocode,
    performSearch,
  }), [reverseGeocode, performSearch]);

  // Handle input changes
  const handleInputChange = (text: string) => {
    setQuery(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current !== undefined) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (text.length === 0) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }
    
    if (text.length >= 2) {
      debouncedSearch(text);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (suggestion: Suggestion) => {
    setQuery(suggestion.name);
    setSuggestions([]);
    setIsFocused(false);
    inputRef.current?.blur();
    
    try {
      // Use Search Box API retrieve method for exact restaurant details and coordinates
      if (suggestion.id) {
        console.log('🔍 Retrieving exact coordinates using Search Box API /retrieve');
        const retrieveUrl = `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.id}`;
        const params = {
          access_token: accessToken,
          session_token: sessionToken.current,
        };
        
        const response = await fetch(`${retrieveUrl}?${new URLSearchParams(params).toString()}`);
        const data = await response.json();
        
        console.log('📡 Full /retrieve API response:', data);
        
        const feature = data.features?.[0];
        
        if (feature && feature.geometry?.coordinates) {
          const [lon, lat] = feature.geometry.coordinates;
          const props = feature.properties || {};
          
          console.log('✅ Exact coordinates from /retrieve endpoint:', {
            name: props.name || suggestion.name,
            coordinates: [lon, lat],
            address: props.full_address || props.place_formatted,
            category: props.category,
            poi_category: props.poi_category,
            fullProperties: props
          });
          
          const place: PlaceResult = {
            id: suggestion.id,
            name: props.name || suggestion.name,
            lat: lat,
            lon: lon,
            address: props.full_address || props.place_formatted || suggestion.address,
            coordinates: [lon, lat],
            cuisine: props.category || props.poi_category || undefined,
            amenity: props.poi_category || mapAmenityFromPOICategory(props.category) || 'restaurant',
          };
          
          onPlaceSelect(place);
          return;
        } else {
          console.error('❌ No coordinates in /retrieve response:', {
            feature,
            hasGeometry: !!feature?.geometry,
            hasCoordinates: !!feature?.geometry?.coordinates,
            fullResponse: data
          });
        }
      }
    } catch (error) {
      console.error('❌ Search Box API /retrieve failed:', error);
    }
    
    // Final fallback with Butuan center coordinates for routing
    console.log('⚠️ No valid coordinates found, using Butuan center as fallback');
    const place: PlaceResult = {
      id: suggestion.id,
      name: suggestion.name || 'Restaurant',
      lat: center[1], // Butuan City center lat
      lon: center[0], // Butuan City center lon
      address: suggestion.address || 'Butuan City, Agusan del Norte',
      coordinates: [center[0], center[1]],
      cuisine: 'Filipino',
      amenity: 'restaurant',
    };
    
    onPlaceSelect(place);
  };
  
  // Helper function to map POI category to amenity type
  function mapAmenityFromPOICategory(category?: string): string {
    if (!category) return 'restaurant';
    const cat = category.toLowerCase();
    if (cat.includes('cafe') || cat.includes('coffee')) return 'cafe';
    if (cat.includes('fast_food')) return 'fast_food';
    if (cat.includes('bar')) return 'bar';
    if (cat.includes('pub')) return 'pub';
    if (cat.includes('bakery')) return 'bakery';
    return 'restaurant';
  }

  // Handle input focus
  const handleFocus = () => {
    setIsFocused(true);
    onSearchFocus?.();
    // Create new session token on focus
    sessionToken.current = createSearchSessionToken();
  };

  // Handle input blur
  const handleBlur = () => {
    // Delay blur to allow suggestion clicks
    setTimeout(() => {
      setIsFocused(false);
      onSearchBlur?.();
    }, 150);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyPress = (event: any) => {
    if (!suggestions.length) return;
    
    switch (event.nativeEvent.key) {
      case 'ArrowDown':
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          handleSuggestionSelect(suggestions[0]);
        }
        break;
      case 'Escape':
        setSuggestions([]);
        inputRef.current?.blur();
        break;
    }
  };

  // Render suggestion item
  const renderSuggestion = ({ item, index }: { item: Suggestion; index: number }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        index === selectedIndex && styles.suggestionItemSelected,
      ]}
      onPress={() => handleSuggestionSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName}>{item.name}</Text>
        {item.address && (
          <Text style={styles.suggestionAddress} numberOfLines={2}>
            {item.address}
          </Text>
        )}
      </View>
      <View style={styles.suggestionIcon}>
        <Text style={styles.iconText}>📍</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={[styles.searchInput, isFocused && styles.searchInputFocused]}>
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>🔍</Text>
        </View>
        
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          placeholderTextColor="#666"
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          blurOnSubmit={false}
        />
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2F80ED" />
          </View>
        )}
        
        {query.length > 0 && !isLoading && (
          <Pressable style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Search Results */}
      {isFocused && (suggestions.length > 0 || isLoading || (query.length >= 2 && suggestions.length === 0)) && (
        <View style={styles.resultsContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2F80ED" />
              <Text style={styles.loadingText}>Searching Butuan dining establishments...</Text>
            </View>
          ) : suggestions.length > 0 ? (
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item) => item.id}
              style={styles.resultsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            />
          ) : query.length >= 2 ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                No dining establishments found in Butuan City
              </Text>
              <Text style={styles.noResultsSubtext}>
                Try searching for restaurants, cafes, bars, or food courts in Butuan.
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
});

// Set display name for debugging
RestaurantSearchBox.displayName = 'RestaurantSearchBox';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchInputFocused: {
    borderColor: '#2F80ED',
    elevation: 6,
    shadowOpacity: 0.18,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchIconText: {
    fontSize: 16,
    color: '#666',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
    ...Platform.select({
      ios: {
        paddingVertical: 0,
      },
      android: {
        paddingVertical: 0,
      },
    }),
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 5,
    borderRadius: 12,
    maxHeight: 250,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  resultsList: {
    flexGrow: 0,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  suggestionItemSelected: {
    backgroundColor: '#F8F9FA',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  suggestionAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  suggestionIcon: {
    marginLeft: 12,
  },
  iconText: {
    fontSize: 18,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  noResultsContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default RestaurantSearchBox;
