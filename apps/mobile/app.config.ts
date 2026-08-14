import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Raftar',
  slug: 'raftar',
  owner: 'abdu1.wahab',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0A',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.raftar.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Raftar uses your location to track runs and capture territory.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0A0A0A',
    },
    package: 'com.raftar.app',
    permissions: ['ACCESS_FINE_LOCATION'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Raftar uses your location to track runs and capture territory.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Raftar to access your photos to set your profile picture.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#FF3B30',
      },
    ],
    '@maplibre/maplibre-react-native',
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
    eas: {
      projectId: 'f3e3a02d-072e-4a6d-9acf-c7a0467f3d4f',
    },
  },
  scheme: 'raftar',
  experiments: {
    typedRoutes: true,
  },
});
