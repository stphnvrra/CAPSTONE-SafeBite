import React, { useMemo, useRef, useState, useEffect } from 'react';

// Suppress specific React Fragment warnings from @rnmapbox/maps library
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Invalid prop') && args[0].includes('React.Fragment') && args[1] === 'sourceID') {
    // Suppress the known @rnmapbox/maps library React Fragment warning
    return;
  }
  originalConsoleError.apply(console, args);
};
import { View, Text, Pressable, StyleSheet, Alert, Switch } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { CONFIG } from '../config/env';
import { fetchCrimeZonesByBBox, signOut } from '../lib/firebase';
import { getPlaceDetails, createSearchSessionToken } from '../lib/places';

// Place type for search results
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
import { fetchDirectionsAlternatives } from '../lib/mapbox';
import { selectCrimeSafeRoute, Coordinate } from '../lib/crime';
import RestaurantBottomSheet, { RestaurantBottomSheetRef } from '../components/RestaurantBottomSheet';
import RestaurantSearchBox, { SearchBoxRef } from '../components/RestaurantSearchBox';
import LogoutModal from '../components/LogoutModal';
import { ensureLocationPermission } from '../lib/permissions';
import { getCurrentPosition } from '../lib/location';
import HeatmapLegend from '../components/HeatmapLegend';

export default function MainMapScreen({ navigation }: any) {
  // Butuan City geographic constraints - based on official city boundaries
  const BUTUAN_CENTER: Coordinate = useMemo(() => [125.543061, 8.947200], []); // Exact center of Butuan City
  const BUTUAN_BOUNDS = useMemo(() => ({ 
    minLon: 125.44627456871875, minLat: 8.750235457081931,
    maxLon: 125.63672866987403, maxLat: 9.051031758534917
  }), []);
  
  // Butuan City exact boundary polygon (traced from official boundary map)
  const BUTUAN_BOUNDARY_POLYGON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          // Starting from northwest and going clockwise
          [125.453934, 8.987316],
          [125.44169653747153, 8.828723186265176],
          [125.45504661632619, 8.778769001680267], 
          [125.48976678540107, 8.746472615740842], 
          [125.64692149710932, 8.753977977913689], // Northeast - Sumilihon area
          [125.65212145049259,  8.790979656797777], // East - Taguibo area
          [125.64398711520352, 8.827248215859978], // East - Ampayon area
          [125.63284887678184, 8.847225735507358], // Southeast - near AH26
          [125.6381183168774, 8.86159831379694], // Southeast - Afga area
          [125.63659357238974, 8.911278980349236], // East - Sumile area
          [125.64805372760158, 8.923278058066868], // Southeast edge
          [125.6524762318141, 8.934842817460174], // South - Maguinda area
          [125.70086362675374, 9.001654223232194], // South - Poblacion area
          [125.71991869260803, 9.047383753297906], // South - Mandamo area
          [125.56493977588823, 9.050904525130184], // Southwest - Tungao area
          [125.56433806281697, 8.998589023808519], // Southwest - Manila de Bugabus
          [125.5255463966134 , 8.998331616309404], // South central - Lingayao
          [125.5227666466448, 9.006618806847193], // Southwest
          [125.51883227762293, 9.01045539423959], // Southwest - Dulag area
          [125.51557983027729, 9.010321547901492], // West - Bonbon area
          [125.5121066377618, 9.009154426723432], // West - Bancasi area
          [125.5114636963486, 9.009260261654386], // Northwest - Ambago area
          [125.50800936301606, 9.011479254883707], // Northwest
          [125.50330943909475, 9.010488421672388], // Northwest
          [125.475, 8.995], // Northwest - toward Magallanes
          [125.453934, 8.987316]  // Close polygon - back to start
        ]]
      },
      properties: { name: 'Butuan City Official Boundary' }
    }]
  }), []);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [crimeFeatures, setCrimeFeatures] = useState<any[]>([]);
  const [destination, setDestination] = useState<Coordinate | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<PlaceResult | null>(null);
  const [route, setRoute] = useState<any | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const sheetRef = useRef<RestaurantBottomSheetRef>(null);
  const searchBoxRef = useRef<SearchBoxRef>(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceResult[]>([]);
  const cameraRef = useRef<MapboxGL.Camera>(null as any);
  const sessionTokenRef = useRef<string>(createSearchSessionToken());

  MapboxGL.setAccessToken(CONFIG.MAPBOX_ACCESS_TOKEN);

  useEffect(() => {
    // initial bbox around center
    fetchCrimeZonesByBBox(
      BUTUAN_BOUNDS.minLon, BUTUAN_BOUNDS.minLat,
      BUTUAN_BOUNDS.maxLon, BUTUAN_BOUNDS.maxLat
    ).then(setCrimeFeatures).catch(() => {});
    // ask for location so we can show user puck
    ensureLocationPermission().then((ok) => setHasLocation(!!ok));
    
    // Set initial camera position to exact Butuan City center
    setTimeout(() => {
      cameraRef.current?.setCamera?.({
        centerCoordinate: BUTUAN_CENTER,
        zoomLevel: 10,
        animationDuration: 1000,
      });
    }, 500);
    
    // no-op cleanup
    return () => {};
  }, [BUTUAN_BOUNDS.minLon, BUTUAN_BOUNDS.minLat, BUTUAN_BOUNDS.maxLon, BUTUAN_BOUNDS.maxLat, BUTUAN_CENTER]);

  // Load places when location changes
  useEffect(() => {
    if (currentLocation) {
      loadNearbyPlaces({ lat: currentLocation[1], lon: currentLocation[0] });
    }
  }, [currentLocation]);

  // Load initial places around Butuan center
  useEffect(() => {
    loadNearbyPlaces({ lat: BUTUAN_CENTER[1], lon: BUTUAN_CENTER[0] });
  }, [BUTUAN_CENTER]);

  async function loadNearbyPlaces(location: { lat: number; lon: number }) {
    try {
      console.log('Loading restaurants near:', location);
      
      // Since we now have a functional search box, we don't need to auto-load nearby places
      // Users can search for restaurants using the search box
      setNearbyPlaces([]);
      console.log('✅ Use the search box to find restaurants in Butuan City');
    } catch (error) {
      console.error('Failed to load nearby restaurants:', error);
      // Set empty array instead of crashing
      setNearbyPlaces([]);
    }
  }

  async function onPlaceMarkerPress(place: PlaceResult) {
    try {
      // Set destination and get detailed info
      setDestination([place.lon, place.lat]);
      const details = await getPlaceDetails(place.id, sessionTokenRef.current);
      
      // Show place details in bottom sheet
      sheetRef.current?.open({ 
        name: details.name || place.name, 
        address: details.address, 
        phone: details.phone,
        website: details.website,
        cuisine: details.cuisine,
        amenity: details.amenity,
        openingHours: details.openingHours,
        description: details.description,
      });
    } catch (error) {
      console.error('Failed to get place details:', error);
      Alert.alert('Error', 'Could not load place details');
    }
  }

  // Handle place selection from search box
  async function handlePlaceSelect(place: PlaceResult) {
    console.log('🎯 Place selected from search:', place);
    
    try {
      // Show a marker for the selected place
      setNearbyPlaces([{
        ...place,
        // Ensure lon/lat are sourced from coordinates if available
        lon: Array.isArray(place.coordinates) ? place.coordinates[0] : place.lon,
        lat: Array.isArray(place.coordinates) ? place.coordinates[1] : place.lat,
      }]);
      
      // Set destination and selected restaurant for red circle marker
      setDestination(place.coordinates);
      setSelectedRestaurant(place);
      
      // Load detailed info for the bottom sheet
      console.log('📋 Getting place details...');
      const details = await getPlaceDetails(place.id, sessionTokenRef.current);
      console.log('📋 Place details:', place);
      
      // Show place details in bottom sheet
      sheetRef.current?.open({
        name: place.name,
        address: place.address,
        phone: details.phone,
        website: details.website,
        amenity: place.amenity[0],
        openingHours: details.openingHours,
        description: details.description,
      });
      
      // Center map on selected place
      cameraRef.current?.setCamera?.({
        centerCoordinate: place.coordinates,
        zoomLevel: 16,
        animationDuration: 1000,
      });
      
    } catch (error) {
      console.error('❌ Failed to load place details:', error);
      Alert.alert('Error', 'Could not load place details');
    }
  }

  // Create a heatmap point set from polygon centroids with intensity
  const heatmapPoints = useMemo(() => {
    function centroid(coords: number[][][]): Coordinate | null {
      // coords[0] is outer ring
      const ring = coords?.[0] || [];
      if (ring.length === 0) return null;
      let x = 0;
      let y = 0;
      for (const [lon, lat] of ring) {
        x += lon;
        y += lat;
      }
      const n = ring.length;
      return [x / n, y / n];
    }
    const features = crimeFeatures
      .map((f: any) => {
        const c = centroid(f?.geometry?.coordinates);
        if (!c) return null;
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: c },
          properties: { intensity: Number(f?.properties?.averageCrimeScore ?? 0) },
        } as const;
      })
      .filter(Boolean);
    return { type: 'FeatureCollection', features } as any;
  }, [crimeFeatures]);



  const routeFeature = useMemo(() => {
    if (!route) return null;
    return {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: route.geometry, properties: {} },
      ],
    } as any;
  }, [route]);

  const placeFeatures = useMemo(() => {
    console.log('Creating place features for', nearbyPlaces.length, 'places');
    const features = {
      type: 'FeatureCollection' as const,
      features: nearbyPlaces.map(place => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [place.lon, place.lat]
        },
        properties: {
          id: place.id,
          name: place.name,
          amenity: place.amenity,
          cuisine: place.cuisine
        }
      }))
    };
    console.log('Place features created:', features);
    return features;
  }, [nearbyPlaces]);

  // Selected restaurant red circle marker
  const selectedRestaurantFeature = useMemo(() => {
    if (!selectedRestaurant) {
      return { type: 'FeatureCollection' as const, features: [] } as any;
    }
    
    console.log('Creating red circle marker for selected restaurant:', selectedRestaurant.name);
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [selectedRestaurant.lon, selectedRestaurant.lat]
        },
        properties: {
          id: selectedRestaurant.id,
          name: selectedRestaurant.name,
          amenity: selectedRestaurant.amenity,
          isSelected: true
        }
      }]
    } as any;
  }, [selectedRestaurant]);

  async function onDirections() {
    try {
      if (!destination) {
        Alert.alert('Select destination', 'Search and select a restaurant first.');
        return;
      }
      
      // Verify destination is within Butuan City bounds
      const [destLon, destLat] = destination;
      if (destLon < BUTUAN_BOUNDS.minLon || destLon > BUTUAN_BOUNDS.maxLon ||
          destLat < BUTUAN_BOUNDS.minLat || destLat > BUTUAN_BOUNDS.maxLat) {
        Alert.alert('Route Error', 'Selected restaurant is outside Butuan City. Please select a restaurant within Butuan City.');
        return;
      }
      
      const pos = await getCurrentPosition().catch(() => null);
      if (!pos) {
        Alert.alert('Location unavailable', 'Enable location to get directions.');
        return;
      }
      
      // Verify origin is within or near Butuan bounds
      if (pos.lon < BUTUAN_BOUNDS.minLon - 0.01 || pos.lon > BUTUAN_BOUNDS.maxLon + 0.01 ||
          pos.lat < BUTUAN_BOUNDS.minLat - 0.01 || pos.lat > BUTUAN_BOUNDS.maxLat + 0.01) {
        Alert.alert('Location Error', 'You are too far from Butuan City. This app only provides routes within Butuan City.');
        return;
      }
      
      // Clamp origin inside Butuan bounds for routing
      const origin: Coordinate = [
        Math.max(BUTUAN_BOUNDS.minLon, Math.min(BUTUAN_BOUNDS.maxLon, pos.lon)),
        Math.max(BUTUAN_BOUNDS.minLat, Math.min(BUTUAN_BOUNDS.maxLat, pos.lat))
      ];
      const dest: Coordinate = destination;
      
      console.log(`🗺️ Creating route within Butuan City from [${origin[1].toFixed(4)}, ${origin[0].toFixed(4)}] to [${dest[1].toFixed(4)}, ${dest[0].toFixed(4)}]`);
      
      const routes = await fetchDirectionsAlternatives(origin, dest);
      // Convert Firestore polygons to algorithm polygons
      const polys = crimeFeatures.map((f: any) => ({
        type: 'Polygon',
        coordinates: f.geometry.coordinates,
        properties: { averageCrimeScore: Number(f.properties?.averageCrimeScore ?? 0) },
      }));
      const { best } = selectCrimeSafeRoute(
        routes.map((r) => ({ id: r.id, geometry: r.geometry, durationSeconds: r.durationSeconds })),
        polys as any
      );
      setRoute(best);
      
      console.log('✅ Crime-safe route created within Butuan City');
    } catch (e: any) {
      Alert.alert('Routing error', e?.message ?? 'Unable to create route within Butuan City');
    }
  }

  function onStopRoute() {
    setRoute(null);
    setDestination(null);
    setSelectedRestaurant(null); // Clear the red circle marker
    sheetRef.current?.close();
    Alert.alert('Route Stopped', 'Navigation has been cancelled.');
  }

  async function onGetDirectionsFromSheet() {
    sheetRef.current?.close();
    await onDirections();
  }
  return (
    <View style={styles.root}>
      {/* Header with logo and Logout */}
      <View style={styles.header}>
        <Text style={styles.logoText}>SafeBite</Text>
        <Pressable onPress={() => setLogoutVisible(true)} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {/* Enhanced Place Search Box */}
      <View style={styles.searchContainer}>
        <RestaurantSearchBox
          ref={searchBoxRef}
          onPlaceSelect={handlePlaceSelect}
          onSearchFocus={() => {
            // Clear selected restaurant when starting new search
            setSelectedRestaurant(null);
          }}
          placeholder="Search restaurants in Butuan City"
          center={BUTUAN_CENTER}
          accessToken={CONFIG.MAPBOX_ACCESS_TOKEN}
          options={{
            types: 'poi,address',
            proximity: BUTUAN_CENTER, // Optional - used for relevance ranking only
            language: 'en',
            limit: 10,
            marker: true,
            allowReverse: true,
            sessionToken: sessionTokenRef.current,
          }}
        />
      </View>

      <View style={styles.mapContainer}>
        <MapboxGL.MapView
          style={StyleSheet.absoluteFill}
          styleURL={MapboxGL.StyleURL.Street}
          onCameraChanged={(e: any) => {
            const zoom = e?.properties?.zoom ?? 11;
            const center = e?.properties?.center as [number, number] | undefined;
            if (!center) return;
            const lon = center[0];
            const lat = center[1];
            const clampedLon = Math.max(BUTUAN_BOUNDS.minLon, Math.min(BUTUAN_BOUNDS.maxLon, lon));
            const clampedLat = Math.max(BUTUAN_BOUNDS.minLat, Math.min(BUTUAN_BOUNDS.maxLat, lat));
            const clampedZoom = Math.max(9, zoom);
            if (clampedLon !== lon || clampedLat !== lat || clampedZoom !== zoom) {
              cameraRef.current?.setCamera?.({
                centerCoordinate: [clampedLon, clampedLat],
                zoomLevel: clampedZoom,
                animationDuration: 0,
              });
            }
          }}
          onPress={async (event: any) => {
            // Reverted: only respond when tapping near an existing marker
            try {
              const pressCoords = event.geometry?.coordinates;
              if (!pressCoords) return;
              const [pressLon, pressLat] = pressCoords;
              if (nearbyPlaces.length === 0) return;
              const clickThreshold = 0.001; // ~100 meters
              const nearestPlace = nearbyPlaces.find(place => {
                const distance = Math.sqrt(
                  Math.pow(place.lon - pressLon, 2) +
                  Math.pow(place.lat - pressLat, 2)
                );
                return distance < clickThreshold;
              });
              if (nearestPlace) {
                onPlaceMarkerPress(nearestPlace);
              }
            } catch (error) {
              console.log('Map press event error:', error);
            }
          }}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            zoomLevel={12}
            centerCoordinate={BUTUAN_CENTER}
            minZoomLevel={8}
            maxZoomLevel={20}
          />

          {/* Butuan City boundary */}
          <MapboxGL.ShapeSource id="butuan-boundary" shape={BUTUAN_BOUNDARY_POLYGON}>
            <MapboxGL.LineLayer
              id="butuan-boundary-stroke"
              style={{ lineColor: '#FFFFFF', lineWidth: 4, lineOpacity: 0.9 }}
            />
            <MapboxGL.LineLayer
              id="butuan-boundary-dash"
              style={{ lineColor: '#2F80ED', lineWidth: 2, lineDasharray: [3, 3], lineOpacity: 0.95 }}
            />
          </MapboxGL.ShapeSource>

          {hasLocation && (
            <MapboxGL.UserLocation
              visible={true}
              showsUserHeadingIndicator={true}
              androidRenderMode="compass"
              onUpdate={(location) => {
                try {
                  if (!location?.coords) return;
                  
                  // Store current location
                  const lon = location.coords.longitude;
                  const lat = location.coords.latitude;
                  
                  if (typeof lon === 'number' && typeof lat === 'number') {
                    // Use functional update to avoid stale closure issues
                    setCurrentLocation([lon, lat]);
                    
                    // Keep camera constrained; if the user is far outside bounds, recenter near center
                    if (
                      lon < BUTUAN_BOUNDS.minLon || lon > BUTUAN_BOUNDS.maxLon ||
                      lat < BUTUAN_BOUNDS.minLat || lat > BUTUAN_BOUNDS.maxLat
                    ) {
                      cameraRef.current?.setCamera?.({ 
                        centerCoordinate: BUTUAN_CENTER, 
                        zoomLevel: 11, 
                        animationDuration: 0 
                      });
                    }
                  }
                } catch (error) {
                  // Silently handle location update errors
                }
              }}
            />
          )}

          <MapboxGL.ShapeSource 
            key="crime-heat-source"
            id="crime-heat" 
            shape={showHeatmap && heatmapPoints?.features ? heatmapPoints : { type: 'FeatureCollection', features: [] }}
          >
            <MapboxGL.HeatmapLayer
              key="crime-heat-layer"
              id="crime-heat-layer"
              style={{
                visibility: showHeatmap && heatmapPoints?.features ? 'visible' : 'none',
                heatmapWeight: ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 5, 1],
                heatmapIntensity: 1.0,
                heatmapRadius: 24,
                heatmapColor: [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0, 'rgba(0,255,0,0)',
                  0.5, 'rgba(0,255,0,0.7)',
                  1, 'rgba(255,0,0,1)'
                ],
              }}
            />
          </MapboxGL.ShapeSource>



          <MapboxGL.ShapeSource 
            key="route-source"
            id="route" 
            shape={routeFeature?.features ? routeFeature : { type: 'FeatureCollection', features: [] }}
          >
            <MapboxGL.LineLayer 
              key="route-line"
              id="route-line" 
              style={{ 
                visibility: routeFeature?.features ? 'visible' : 'none',
                lineColor: '#2F80ED', 
                lineWidth: 4, 
                lineOpacity: 0.9 
              }} 
            />
          </MapboxGL.ShapeSource>

          {/* Place markers */}
          <MapboxGL.ShapeSource 
            key="places-source"
            id="places" 
            shape={placeFeatures}
          >
            <MapboxGL.CircleLayer
              key="places-circles"
              id="places-circles"
              style={{
                circleRadius: ['case',
                  ['==', ['get', 'amenity'], 'fast_food'], 8,
                  ['==', ['get', 'amenity'], 'cafe'], 6,
                  ['==', ['get', 'amenity'], 'bar'], 7,
                  ['==', ['get', 'amenity'], 'pub'], 7,
                  ['==', ['get', 'amenity'], 'restaurant'], 8,
                  6  // Default size for other types of places
                ],
                circleColor: ['case',
                  ['==', ['get', 'amenity'], 'fast_food'], '#FF6B35',
                  ['==', ['get', 'amenity'], 'cafe'], '#8B4513',
                  ['==', ['get', 'amenity'], 'bar'], '#FFD700',
                  ['==', ['get', 'amenity'], 'pub'], '#32CD32',
                  ['==', ['get', 'amenity'], 'restaurant'], '#E74C3C',
                  '#2196F3'  // Default blue color for other places
                ],
                circleStrokeWidth: 2,
                circleStrokeColor: '#FFFFFF',
                circleOpacity: 0.8
              }}
            />
            <MapboxGL.SymbolLayer
              key="places-labels"
              id="places-labels"
              style={{
                textField: ['get', 'name'],
                textFont: ['Open Sans Regular'],
                textSize: 10,
                textColor: '#333333',
                textHaloColor: '#FFFFFF',
                textHaloWidth: 1,
                textOffset: [0, 2],
                textAnchor: 'top',
                textMaxWidth: 8,
                textAllowOverlap: false,
                textIgnorePlacement: false
              }}
            />
          </MapboxGL.ShapeSource>

          {/* Selected restaurant red circle marker */}
          <MapboxGL.ShapeSource 
            key="selected-restaurant-source"
            id="selected-restaurant" 
            shape={selectedRestaurantFeature}
          >
            <MapboxGL.CircleLayer
              key="selected-restaurant-circle"
              id="selected-restaurant-circle"
              style={{
                circleRadius: 8,
                circleColor: 'rgba(0, 81, 255, 0.9)', // Bright red color
                circleStrokeWidth: 3,
                circleStrokeColor: '#FFFFFF',
                circleOpacity: 0.9
              }}
            />
          </MapboxGL.ShapeSource>
        </MapboxGL.MapView>

        <HeatmapLegend />

        <View style={styles.toggles}>
          <Pressable style={styles.square} onPress={() => navigation.navigate('ARView')}>
            <Text style={styles.squareText}>AR</Text>
          </Pressable>
        </View>
        <View style={styles.hmRow}>
            <Text style={styles.hmLabel}>HM</Text>
            <Switch value={showHeatmap} onValueChange={setShowHeatmap} />
        </View>
        

        {/* Recenter FAB */}
        <Pressable 
          style={styles.fabCenter} 
          onPress={() => {
            cameraRef.current?.setCamera?.({
              centerCoordinate: BUTUAN_CENTER,
              zoomLevel: 11,
              animationDuration: 1000,
            });
          }}
        >
          <Text style={styles.fabText}>C</Text>
        </Pressable>

                {/* My Location FAB */}
        <Pressable 
          style={[styles.fabPosition]} 
          onPress={async () => {
            if (currentLocation) {
              cameraRef.current?.setCamera?.({
                centerCoordinate: currentLocation,
                zoomLevel: 16,
                animationDuration: 1000,
              });
            } else {
              try {
                const pos = await getCurrentPosition();
                const location: Coordinate = [pos.lon, pos.lat];
                setCurrentLocation(() => location);
                cameraRef.current?.setCamera?.({
                  centerCoordinate: location,
                  zoomLevel: 16,
                  animationDuration: 1000,
                });
              } catch (error) {
                Alert.alert('Location Error', 'Unable to get your current location. Please check GPS and permissions.');
              }
            }
          }}
        >
          <Text style={styles.fabText}>⌖</Text>
        </Pressable>
        
        {route ? (
          <Pressable style={[styles.stop, { backgroundColor: '#DC3545' }]} onPress={onStopRoute}>
            <Text style={styles.stopText}>Stop Route</Text>
          </Pressable>
        ) : destination ? (
          <Pressable style={styles.stop} onPress={onDirections}>
            <Text style={styles.stopText}>Get Crime-Safe Direction</Text>
          </Pressable>
        ) : null}
        
        {/* Current Location Display */}
        {/* {currentLocation && (
          <View style={styles.locationDisplay}>
            <Text style={styles.locationText}>
              📍 {currentLocation[1].toFixed(6)}, {currentLocation[0].toFixed(6)}
            </Text>
          </View>
        )} */}
      </View>
      <RestaurantBottomSheet ref={sheetRef} onGetDirections={onGetDirectionsFromSheet} />
      <LogoutModal visible={logoutVisible} onConfirm={async () => { await signOut(); setLogoutVisible(false); navigation.replace('Login'); }} onCancel={() => setLogoutVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#DDD' },
  header: { position: 'absolute', top: 10, left: 16, right: 16, zIndex: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoText: { color: '#2F80ED', fontWeight: '700', fontSize: 20 },
  logoutBtn: { backgroundColor: '#D9534F', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  logoutText: { color: '#FFF', fontWeight: '700' },
  searchContainer: { position: 'absolute', top: 56, left: 16, right: 16, zIndex: 10 },
  mapPlaceholder: { flex: 1, marginTop: 104, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C7D0D9' },
  mapContainer: { flex: 1, marginTop: 104, backgroundColor: '#C7D0D9' },
  toggles: { position: 'absolute', right: 16, top: 150, alignItems: 'center' },
  hmRow: { position: 'absolute', right: 16, top: 80, backgroundColor: '#000', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, width:90 },
  hmLabel: { color: '#FFF', fontWeight: '700', marginRight: 6 },
  square: { width: 42, height: 42, backgroundColor: '#000', opacity: 0.85, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 8,  position: 'absolute', right: 0, bottom: 80},
  squareText: { color: '#FFF', fontWeight: '700' },
  stop: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: 'rgb(21, 212, 0)', paddingHorizontal: 40, paddingVertical: 10, borderRadius: 12 },
  stopText: { color: '#FFF', fontWeight: '700', },
  fabPosition: { position: 'absolute', right: 16, bottom: 150, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF0000', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  fabCenter: { position: 'absolute', right: 16, bottom: 90, width: 44, height: 44, borderRadius: 22, backgroundColor: '#2F80ED', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  fabText: { color: '#FFF', fontSize: 24, fontWeight: '700', marginTop: -2 },
  locationDisplay: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  locationText: { color: '#FFF', fontSize: 12, fontFamily: 'monospace' },
});

