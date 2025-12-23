/**
 * @format
 */

import { AppRegistry } from 'react-native';
import '@react-native-firebase/app';
import MapboxGL from '@rnmapbox/maps';
import App from './App';
import { ensureFirebase } from './src/lib/firebase';
import { CONFIG } from './src/config/env';
import { name as appName } from './app.json';

// Initialize Mapbox access token before any Mapbox components are used
MapboxGL.setAccessToken(CONFIG.MAPBOX_ACCESS_TOKEN);

// Initializes Firebase app on startup before registering the main component
ensureFirebase();
AppRegistry.registerComponent(appName, () => App);
