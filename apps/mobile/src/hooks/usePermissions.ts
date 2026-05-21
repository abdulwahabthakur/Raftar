import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export function useLocationPermission() {
  const [status, setStatus] = useState<LocationPermissionStatus>('undetermined');

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status: s }) => {
      setStatus(s === 'granted' ? 'granted' : s === 'undetermined' ? 'undetermined' : 'denied');
    });
  }, []);

  async function requestPermission(): Promise<boolean> {
    const { status: s } = await Location.requestForegroundPermissionsAsync();
    const granted = s === 'granted';
    setStatus(granted ? 'granted' : 'denied');
    return granted;
  }

  return { status, requestPermission };
}
