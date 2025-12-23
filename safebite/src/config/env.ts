// Load environment variables from .env file via react-native-dotenv
import { MAPBOX_ACCESS_TOKEN } from '@env';

export const CONFIG = {
  MAPBOX_ACCESS_TOKEN: MAPBOX_ACCESS_TOKEN || '',
} as const;

