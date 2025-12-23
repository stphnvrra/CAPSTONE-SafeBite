import React, { useMemo, useRef, useState, useEffect } from 'react';

const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Invalid prop') && args[0].includes('React.Fragment') && args[1] === 'sourceID') {
    return;
  }
  originalConsoleError.apply(console, args);
};
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import MapboxGL from '@rnmapbox/maps';
import { CONFIG } from '../config/env';
import { fetchCrimeZonesByBBox, signOut } from '../lib/firebase';
import { saveRoute } from '../lib/routes';
import { getPlaceDetails, createSearchSessionToken } from '../lib/places';
import { launchUnityARApp, checkUnityARAppInstalled } from '../lib/unityLauncher';

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
import { fetchDirectionsAlternatives, fetchDirectionsViaWaypoint } from '../lib/mapbox';
import { selectCrimeSafeRoute, Coordinate, routeIntersectsAnyPolygon, normalizeFirestoreCrimeFeatures, getFirstIntersectingPolygon, detourWaypointsAroundPolygon } from '../lib/crime';
import RestaurantBottomSheet, { RestaurantBottomSheetRef } from '../components/RestaurantBottomSheet';
import RestaurantSearchBox, { SearchBoxRef } from '../components/RestaurantSearchBox';
import LogoutModal from '../components/LogoutModal';
import { ensureLocationPermission } from '../lib/permissions';
import { getCurrentPosition, watchPosition } from '../lib/location';
import HeatmapLegend from '../components/HeatmapLegend';
import SafeRouteModal from '../components/SafeRouteModal';


export default function MainMapScreen({ navigation }: any) {
  const isFocused = useIsFocused();
  const AndroidMapView: any = MapboxGL.MapView;
  const BUTUAN_CENTER: Coordinate = useMemo(() => [125.543061, 8.947200], []); 
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
  const [safeRouteVisible, setSafeRouteVisible] = useState(false);
  const riskyBestRef = useRef<any | null>(null);
  const lastOriginRef = useRef<Coordinate | null>(null);
  const lastDestRef = useRef<Coordinate | null>(null);
  const sheetRef = useRef<RestaurantBottomSheetRef>(null);
  const searchBoxRef = useRef<SearchBoxRef>(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceResult[]>([]);
  const [unityAppInstalled, setUnityAppInstalled] = useState<boolean>(false);
  const [isSearchingRoute, setIsSearchingRoute] = useState<boolean>(false);
  const cameraRef = useRef<MapboxGL.Camera>(null as any);
  const sessionTokenRef = useRef<string>(createSearchSessionToken());

  // Function: Starts AR navigation by launching the Unity app
  // - Requires a route to be created first
  // - Checks if the Unity app is installed
  async function onStartARNavigation() {
    try {
      if (!route) {
        Alert.alert('No Route', 'Please create a route first before starting AR navigation.');
        return;
      }
      
      // Check if Unity AR app is installed
      const isInstalled = await checkUnityARAppInstalled();
      if (!isInstalled) {
        Alert.alert(
          'AR App Required',
          'The SafeBite AR app (com.safebitear) is not installed. Please install it to use AR navigation features.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Launch the Unity AR app
      await launchUnityARApp();
      
      // The Unity app should read the route data from Firestore
      
    } catch (error) {
      console.error('❌ AR Navigation error:', error);
      Alert.alert('AR Error', 'Failed to start AR navigation. Please try again.');
    }
  }

  // Mapbox: set access token once for map usage
  MapboxGL.setAccessToken(CONFIG.MAPBOX_ACCESS_TOKEN);

  // Effect: initial data and setup when the screen mounts
  // - Loads crime zones for the whole city
  // - Requests location permission
  // - Checks Unity app availability
  // - Positions the camera to city center
  // - Starts watching the user's location
  useEffect(() => {
    // initial bbox around center
    fetchCrimeZonesByBBox(
      BUTUAN_BOUNDS.minLon, BUTUAN_BOUNDS.minLat,
      BUTUAN_BOUNDS.maxLon, BUTUAN_BOUNDS.maxLat
    ).then(setCrimeFeatures).catch(() => {});
    // ask for location so we can show user puck
    ensureLocationPermission().then((ok) => setHasLocation(!!ok));
    
    // Check Unity AR app installation status
    checkUnityARAppInstalled().then(setUnityAppInstalled).catch(() => setUnityAppInstalled(false));
    
    // Set initial camera position to exact Butuan City center
    setTimeout(() => {
      cameraRef.current?.setCamera?.({
        centerCoordinate: BUTUAN_CENTER,
        zoomLevel: 10,
        animationDuration: 1000,
      });
    }, 500);
    
    // Begin streaming live location updates for 2D map
    const stopWatching = watchPosition((pos) => {
      try {
        const lon = pos.lon;
        const lat = pos.lat;
        if (typeof lon === 'number' && typeof lat === 'number') {
          setCurrentLocation([lon, lat]);
        }
      } catch {}
    });
    
    // no-op cleanup
    return () => {
      try { stopWatching?.(); } catch {}
    };
  }, [BUTUAN_BOUNDS.minLon, BUTUAN_BOUNDS.minLat, BUTUAN_BOUNDS.maxLon, BUTUAN_BOUNDS.maxLat, BUTUAN_CENTER]);

  // Effect: when the current location changes, update nearby places
  useEffect(() => {
    if (currentLocation) {
      loadNearbyPlaces({ lat: currentLocation[1], lon: currentLocation[0] });
    }
  }, [currentLocation]);

  // Effect: on mount, load default places around city center
  useEffect(() => {
    loadNearbyPlaces({ lat: BUTUAN_CENTER[1], lon: BUTUAN_CENTER[0] });
  }, [BUTUAN_CENTER]);

  // Function: Loads nearby places for a given coordinate
  // - Currently minimized because the search box is the primary entry point
  async function loadNearbyPlaces(location: { lat: number; lon: number }) {
    try {
      
      // Since we now have a functional search box, we don't need to auto-load nearby places
      // Users can search for restaurants using the search box
      setNearbyPlaces([]);
    } catch (error) {
      console.error('Failed to load nearby restaurants:', error);
      // Set empty array instead of crashing
      setNearbyPlaces([]);
    }
  }

  // Function: When tapping near a place marker on the map
  // - Clears any existing route
  // - Sets destination and opens the bottom sheet with details
  async function onPlaceMarkerPress(place: PlaceResult) {
    try {
      // Clear any existing route when selecting a new place via marker press
      if (route) {
        setRoute(null);
      }
      
      // Set destination and selected restaurant
      setDestination([place.lon, place.lat]);
      setSelectedRestaurant(place);
      const details = await getPlaceDetails(place.id, sessionTokenRef.current);
      
      // Show place details in bottom sheet
      sheetRef.current?.open({ 
        name: details.name || place.name, 
        address: details.address, 
        amenity: details.amenity,
      });
    } catch (error) {
      console.error('Failed to get place details:', error);
      Alert.alert('Error', 'Could not load place details');
    }
  }

  // Function: When a place is selected in the search box
  // - Clears any existing route
  // - Marks the place on the map
  // - Opens bottom sheet and centers camera on the place
  async function handlePlaceSelect(place: PlaceResult) {
    
    try {
      // Clear any existing route when selecting a new place
      if (route) {
        setRoute(null);
      }
      
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
      const details = await getPlaceDetails(place.id, sessionTokenRef.current);
      
      // Show place details in bottom sheet
      sheetRef.current?.open({
        name: place.name,
        address: place.address,
        amenity: place.amenity,
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

  // Create a heatmap point set from polygon/multipolygon centroids with intensity
  // Derives heatmap point features by computing centroids from polygons and intensity
  const heatmapPoints = useMemo(() => {
    function centroid(coords: any): Coordinate | null {
      if (!coords) return null;
      // MultiPolygon: number[][][][]
      if (Array.isArray(coords[0]) && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0])) {
        let sumLon = 0;
        let sumLat = 0;
        let count = 0;
        for (const poly of coords as number[][][][]) {
          const ring = (poly?.[0] || []) as number[][];
          for (const pos of ring) {
            if (Array.isArray(pos) && pos.length >= 2) {
              sumLon += Number(pos[0]);
              sumLat += Number(pos[1]);
              count += 1;
            }
          }
        }
        if (count === 0) return null;
        return [sumLon / count, sumLat / count];
      }
      // Polygon: number[][][]
      if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
        const ring = (coords?.[0] || []) as number[][];
        if (ring.length === 0) return null;
        let sumLon = 0;
        let sumLat = 0;
        for (const pos of ring) {
          if (Array.isArray(pos) && pos.length >= 2) {
            sumLon += Number(pos[0]);
            sumLat += Number(pos[1]);
          }
        }
        const n = ring.length;
        if (n === 0) return null;
        return [sumLon / n, sumLat / n];
      }
      return null;
    }
    const features = crimeFeatures
      .map((f: any) => {
        const c = centroid(f?.geometry?.coordinates);
        if (!c || !isFinite(c[0]) || !isFinite(c[1])) return null;
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: c },
          properties: {
            intensity: Number(f?.properties?.averageCrimeScore ?? 0),
            count: Number((f?.properties && (f.properties.count ?? f.properties.averageCrimeScore)) ?? 0),
            riskLevel: String(f?.properties?.riskLevel || '').toLowerCase(),
            score: Number(f?.properties?.averageCrimeScore ?? 0),
            streetName: String(f?.properties?.street_name || ''),
          },
        } as const;
      })
      .filter(Boolean);
    return { type: 'FeatureCollection', features } as any;
  }, [crimeFeatures]);

  // Split into two collections to avoid filter expressions issues on some RN Mapbox builds
  const heatmapHigh = useMemo(() => ({
    type: 'FeatureCollection',
    features: (heatmapPoints?.features || []).filter((f: any) => (f.properties?.riskLevel || '') === 'high'),
  }) as any, [heatmapPoints]);

  const heatmapModerate = useMemo(() => {
    const allFeatures = heatmapPoints?.features || [];
    const moderateFeatures = allFeatures.filter((f: any) => (f.properties?.riskLevel || '') === 'moderate');
    
    // Debug logging
    console.log('🔍 Heatmap debug - Total features:', allFeatures.length);
    console.log('🔍 Moderate features:', moderateFeatures.length);
    console.log('🔍 Sample moderate feature:', moderateFeatures[0]);
    console.log('🔍 All risk levels:', allFeatures.map(f => ({riskLevel: f.properties?.riskLevel, score: f.properties?.score})));
    
    return {
      type: 'FeatureCollection',
      features: moderateFeatures,
    } as any;
  }, [heatmapPoints]);



  // Derived data: GeoJSON for the currently selected route (for map drawing)
  const routeFeature = useMemo(() => {
    if (!route) return null;
    return {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: route.geometry, properties: {} },
      ],
    } as any;
  }, [route]);


  // Derived data: GeoJSON FeatureCollection of the visible place markers
  const placeFeatures = useMemo(() => {
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
    return features;
  }, [nearbyPlaces]);

  // Derived data: Single red marker for the selected restaurant (highlight)
  const selectedRestaurantFeature = useMemo(() => {
    if (!selectedRestaurant) {
      return { type: 'FeatureCollection' as const, features: [] } as any;
    }
    
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

  // Function: Creates a crime-aware route within city bounds
  // - Validates inputs and bounds
  // - Picks a safe route or tries waypoints to avoid high-risk areas
  // - Saves the final route for AR usage
  async function onDirections() {
    if (isSearchingRoute) {
      return; // Prevent multiple simultaneous route searches
    }
    
    try {
      setIsSearchingRoute(true);
      
      // Clear any existing route first when starting a new route calculation
      if (route) {
        setRoute(null);
      }
      
      if (!destination) {
        Alert.alert('Select destination', 'Search and select a restaurant first.');
        setIsSearchingRoute(false);
        return;
      }
      
      // Verify destination is within Butuan City bounds
      const [destLon, destLat] = destination;
      if (destLon < BUTUAN_BOUNDS.minLon || destLon > BUTUAN_BOUNDS.maxLon ||
          destLat < BUTUAN_BOUNDS.minLat || destLat > BUTUAN_BOUNDS.maxLat) {
        Alert.alert('Route Error', 'Selected restaurant is outside Butuan City. Please select a restaurant within Butuan City.');
        setIsSearchingRoute(false);
        return;
      }
      
      const pos = await getCurrentPosition().catch(() => null);
      if (!pos) {
        Alert.alert('Location unavailable', 'Enable location to get directions.');
        setIsSearchingRoute(false);
        return;
      }
      
      // Verify origin is within or near Butuan bounds
      if (pos.lon < BUTUAN_BOUNDS.minLon - 0.01 || pos.lon > BUTUAN_BOUNDS.maxLon + 0.01 ||
          pos.lat < BUTUAN_BOUNDS.minLat - 0.01 || pos.lat > BUTUAN_BOUNDS.maxLat + 0.01) {
        Alert.alert('Location Error', 'You are too far from Butuan City. This app only provides routes within Butuan City.');
        setIsSearchingRoute(false);
        return;
      }
      
      // Clamp origin inside Butuan bounds for routing
      const origin: Coordinate = [
        Math.max(BUTUAN_BOUNDS.minLon, Math.min(BUTUAN_BOUNDS.maxLon, pos.lon)),
        Math.max(BUTUAN_BOUNDS.minLat, Math.min(BUTUAN_BOUNDS.maxLat, pos.lat))
      ];
      const dest: Coordinate = destination;
      
      
      // Store last OD for potential modal-based proceed
      lastOriginRef.current = origin;
      lastDestRef.current = dest;

      let routes = await fetchDirectionsAlternatives(origin, dest);
      // Normalize polygons and split high-risk ones for strict avoidance
      const { all: allPolys, highRisk } = normalizeFirestoreCrimeFeatures(crimeFeatures);

      // Filter out any route that intersects a high-risk polygon
      const safeCandidates = routes
        .map((r) => ({ id: r.id, geometry: r.geometry, durationSeconds: r.durationSeconds }))
        .filter((c) => !routeIntersectsAnyPolygon(c, highRisk, { intervalMeters: 2, bufferMeters: 4 }));

      let chosen;
      if (safeCandidates.length > 0) {
        // Among strictly safe candidates, choose the one with lowest overall exposure
        chosen = selectCrimeSafeRoute(safeCandidates, allPolys as any).best;
      } else {
        // Try to create a detour via a waypoint just outside the first intersecting high-risk polygon
        const margins = [80, 120, 160, 220];
        for (const baseRoute of routes) {
          const offender = getFirstIntersectingPolygon(
            { id: baseRoute.id, geometry: baseRoute.geometry, durationSeconds: baseRoute.durationSeconds },
            highRisk,
          );
          if (!offender) continue;
          for (const m of margins) {
            const waypoints = detourWaypointsAroundPolygon(offender as any, m);
            let found: any = null;
            for (const wp of waypoints) {
              try {
                const viaRoutes = await fetchDirectionsViaWaypoint(origin, wp as any, dest);
                const viaSafe = viaRoutes
                  .map((r) => ({ id: r.id, geometry: r.geometry, durationSeconds: r.durationSeconds }))
                  .filter((c) => !routeIntersectsAnyPolygon(c, highRisk, { intervalMeters: 2, bufferMeters: 6 }));
                if (viaSafe.length > 0) {
                  found = selectCrimeSafeRoute(viaSafe, allPolys as any).best;
                  break;
                }
              } catch (_e) {
                // try next waypoint
              }
            }
            if (found) { chosen = found; break; }
          }
          if (chosen) break;
        }
        // If still no strictly-safe candidate, offer user to proceed via lowest-exposure route
        if (!chosen) {
          // Precompute the lowest-exposure route and show our custom modal
          riskyBestRef.current = selectCrimeSafeRoute(
            routes.map((r) => ({ id: r.id, geometry: r.geometry, durationSeconds: r.durationSeconds })),
            allPolys as any,
          ).best;
          setSafeRouteVisible(true);
          setIsSearchingRoute(false); // Reset loading state when showing modal
          return;
        }
      }
      setRoute(chosen);

      // Persist route for Unity AR consumption
      try {
        const result = await saveRoute({
          origin: { lon: origin[0], lat: origin[1] },
          destination: { lon: dest[0], lat: dest[1] },
          coordinates: (chosen.geometry?.coordinates ?? []) as [number, number][],
        });
        
      } catch (err) {
        
      }
      
    } catch (e: any) {
      Alert.alert('Routing error', e?.message ?? 'Unable to create route within Butuan City');
    } finally {
      setIsSearchingRoute(false);
    }
  }

  // Function: Stops the current route and clears selection
  function onStopRoute() {
    setRoute(null);
    setDestination(null);
    setSelectedRestaurant(null); // Clear the red circle marker
    sheetRef.current?.close();
  }

  // Function: Trigger routing from the bottom sheet button
  async function onGetDirectionsFromSheet() {
    sheetRef.current?.close();
    await onDirections();
  }

  // Removed AR navigation handler implementation

  // Removed ARCore support check implementation

  // UI: Main screen layout
  // - Search box at top
  // - Map view with boundary, heatmap, markers, and route line
  // - Right-side controls (AR and Heatmap toggle)
  // - Bottom floating buttons (recenter, my location, stop/route)
  // - BottomSheet for place details, Logout modal, SafeRoute modal
  return (
    <View style={styles.root}>
      {/* UI: Place search box (Mapbox-powered) */}
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

      {/* UI: Logout button (opens confirmation modal) */}
      <Pressable onPress={() => setLogoutVisible(true)} style={styles.logoutSquare}>
        <Text style={styles.logoutIcon}>➜]</Text>
      </Pressable>

      <View style={styles.mapContainer}>
        {isFocused && (
        <AndroidMapView
          style={StyleSheet.absoluteFill}
          styleURL={MapboxGL.StyleURL.Street}
          textureMode={true}
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
            // UI interaction: react to taps near an existing place marker
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
              
            }
          }}
        >
          {/* UI: Camera and layers inside the map (boundary, heatmap, markers, route) */}
          <MapboxGL.Camera
            ref={cameraRef}
            zoomLevel={12}
            centerCoordinate={BUTUAN_CENTER}
            minZoomLevel={8}
            maxZoomLevel={20}
          />

          {/* UI: Butuan City boundary (white outer + blue dashed inner stroke) */}
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

          {/* UI: Heatmap layers (split high vs low risk) */}
          <MapboxGL.ShapeSource 
            key="crime-heat-source-high"
            id="crime-heat-high" 
            shape={showHeatmap ? heatmapHigh : { type: 'FeatureCollection', features: [] }}
          >
            <MapboxGL.HeatmapLayer
              key="crime-heat-layer-high"
              id="crime-heat-layer-high"
              style={{
                visibility: showHeatmap && (heatmapHigh?.features?.length || 0) > 0 ? 'visible' : 'none',
                heatmapWeight: ['interpolate', ['linear'], ['get', 'count'], 0, 0, 120, 1],
                heatmapIntensity: ['interpolate', ['linear'], ['zoom'], 10, 1.2, 13, 2.0, 16, 3.0, 18, 3.2],
                heatmapRadius: ['interpolate', ['linear'], ['zoom'], 10, 28, 12, 36, 14, 48, 16, 90],
                heatmapOpacity: 1,
                heatmapColor: ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(255,0,0,0)', 0.1, 'rgba(255,0,0,1)', 0.4, 'rgba(255,0,0,1)', 1, 'rgba(255,0,0,1)'],
              }}
            />
          </MapboxGL.ShapeSource>

          <MapboxGL.ShapeSource 
            key="crime-heat-source-moderate"
            id="crime-heat-moderate" 
            shape={showHeatmap ? heatmapModerate : { type: 'FeatureCollection', features: [] }}
          >
            <MapboxGL.HeatmapLayer
              key="crime-heat-layer-moderate"
              id="crime-heat-layer-moderate"
              style={{
                visibility: showHeatmap && (heatmapModerate?.features?.length || 0) > 0 ? 'visible' : 'none',
                heatmapWeight: ['interpolate', ['linear'], ['get', 'count'], 0, 0, 120, 1],
                heatmapIntensity: ['interpolate', ['linear'], ['zoom'], 10, 1.2, 13, 2.0, 16, 3.0, 18, 3.2],
                heatmapRadius: ['interpolate', ['linear'], ['zoom'], 10, 28, 12, 36, 14, 48, 16, 64],
                heatmapOpacity: 1,
                heatmapColor: ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(255,165,0,0)', 0.1, 'rgba(255,165,0,1)', 0.4, 'rgba(255,165,0,1)', 1, 'rgba(255,165,0,1)'],
              }}
            />
          </MapboxGL.ShapeSource>

          {/* Display average crime scores as text labels on the map - only for moderate and high risk */}
          <MapboxGL.ShapeSource 
            key="crime-score-labels-high"
            id="crime-score-labels-high" 
            shape={showHeatmap ? heatmapHigh : { type: 'FeatureCollection', features: [] }}
            onPress={(event) => {
              console.log('🔍 High risk cluster pressed:', event.nativeEvent?.payload);
            }}
          >
            <MapboxGL.SymbolLayer
              key="crime-score-labels-high-text"
              id="crime-score-labels-high-text"
              style={{
                visibility: showHeatmap ? 'visible' : 'none',
                textField: ['get', 'score'],
                textFont: ['Open Sans Bold', 'Arial Unicode MS Bold'],
                textSize: 10,
                textColor: '#000000',
                textHaloColor: '#FFFFFFFF',
                textHaloWidth: 2,
                textAnchor: 'center',
                textOffset: [0, 0],
                symbolPlacement: 'point',
                textAllowOverlap: true,
                textIgnorePlacement: false
              }}
            />
          </MapboxGL.ShapeSource>

          <MapboxGL.ShapeSource 
            key="crime-score-labels-moderate"
            id="crime-score-labels-moderate" 
            shape={showHeatmap ? heatmapModerate : { type: 'FeatureCollection', features: [] }}
            onPress={(event) => {
              console.log('🔍 Moderate risk cluster pressed:', event.nativeEvent?.payload);
            }}
          >
            <MapboxGL.SymbolLayer
              key="crime-score-labels-moderate-text"
              id="crime-score-labels-moderate-text"
              style={{
                visibility: showHeatmap ? 'visible' : 'none',
                textField: ['get', 'score'],
                textFont: ['Open Sans Bold', 'Arial Unicode MS Bold'],
                textSize: 14,
                textColor: '#000000',
                textHaloColor: '#FFFFFFFF',
                textHaloWidth: 2,
                textAnchor: 'center',
                textOffset: [0, 0],
                symbolPlacement: 'point',
                textAllowOverlap: true,
                textIgnorePlacement: false
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

          {/* UI: Place markers (points with labels) */}
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

          {/* UI: Red highlight marker for the selected restaurant */}
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
        </AndroidMapView>
        )}

        {/* UI: Legend for heatmap */}
        <HeatmapLegend />

        {/* UI: Right-side stacked buttons (AR launcher and Heatmap toggle) */}
        <View style={styles.toggles}>
          <Pressable 
            style={[
              styles.square, 
              { 
                backgroundColor: !unityAppInstalled ? '#DC3545' : // Red if Unity app not installed
                                route ? '#4CAF50' : // Green when route available and Unity app installed
                                '#B0B0B0' // Gray when Unity app installed but no route
              }
            ]} 
            onPress={onStartARNavigation}
          >
            <Text style={styles.squareText}>AR</Text>
          </Pressable>
          <Pressable
            style={styles.square}
            onPress={() => setShowHeatmap((v) => !v)}
          >
            <Text style={styles.squareText}>HM</Text>
          </Pressable>

        </View>
        

        {/* UI: Recenter button (moves camera to city center) */}
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

        {/* UI: My Location button (moves camera to current user location) */}
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
        
        {/* UI: Stop Route button or Get Directions button depending on state */}
        {route ? (
          <Pressable style={[styles.stop, { backgroundColor: '#DC3545' }]} onPress={onStopRoute}>
            <Text style={styles.stopText}>Stop Route</Text>
          </Pressable>
        ) : destination ? (
          <Pressable 
            style={[
              styles.stop, 
              { backgroundColor: isSearchingRoute ? '#888888' : 'rgb(21, 212, 0)' }
            ]} 
            onPress={isSearchingRoute ? undefined : onDirections}
            disabled={isSearchingRoute}
          >
            <Text style={styles.stopText}>
              {isSearchingRoute ? 'Searching Route...' : 'Get Crime-Safe Direction'}
            </Text>
          </Pressable>
        ) : null}
        
      </View>
      {/* UI: Bottom sheet for place details and a directions button */}
      <RestaurantBottomSheet ref={sheetRef} onGetDirections={onGetDirectionsFromSheet} isLoadingRoute={isSearchingRoute} />
      {/* UI: Logout confirmation modal */}
      <LogoutModal visible={logoutVisible} onConfirm={async () => { await signOut(); setLogoutVisible(false); navigation.replace('Login'); }} onCancel={() => setLogoutVisible(false)} />
      {/* UI: Modal to proceed with lowest-exposure route when strict safe route is not available */}
      <SafeRouteModal
        visible={safeRouteVisible}
        onCancel={() => setSafeRouteVisible(false)}
        onProceed={() => {
          if (riskyBestRef.current) {
            setRoute(riskyBestRef.current);
            // Also persist when proceeding via modal
            
            try {
              const o = lastOriginRef.current;
              const d = lastDestRef.current;
              if (o && d) {
                saveRoute({
                  origin: { lon: o[0], lat: o[1] },
                  destination: { lon: d[0], lat: d[1] },
                  coordinates: (riskyBestRef.current.geometry?.coordinates ?? []) as [number, number][],
                }).then(() => {}).catch(() => {});
              } else {
                
              }
            } catch (e) {
              
            }
          }
          setSafeRouteVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#DDD' },
  searchContainer: { position: 'absolute', top: 35, left: 16, right: 16, zIndex: 10 },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C7D0D9' },
  mapContainer: { flex: 1, backgroundColor: '#C7D0D9' },
  toggles: { position: 'absolute', right: 16, top: 160, alignItems: 'center' },
  square: { width: 42, height: 42, backgroundColor: '#000', opacity: 0.85, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  squareText: { color: '#FFF', fontWeight: '700' },
  stop: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: 'rgb(21, 212, 0)', paddingHorizontal: 40, paddingVertical: 10, borderRadius: 12 },
  stopText: { color: '#FFF', fontWeight: '700', },
  fabPosition: { position: 'absolute', right: 16, bottom: 150, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF0000', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  fabCenter: { position: 'absolute', right: 16, bottom: 90, width: 44, height: 44, borderRadius: 22, backgroundColor: '#2F80ED', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  fabText: { color: '#FFF', fontSize: 24, fontWeight: '700', marginTop: -2 },
  locationDisplay: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  locationText: { color: '#FFF', fontSize: 12, fontFamily: 'monospace' },
  logoutSquare: { position: 'absolute', right: 16, top: 100, width: 44, height: 44, backgroundColor: 'rgb(255, 0, 0)', borderRadius: 8, alignItems: 'center', justifyContent: 'center', zIndex: 9 },
  logoutIcon: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});


