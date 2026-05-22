import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { GPSPoint } from '@/types';
import { pushGPSPoint } from './gpsBuffer';
import { useRunStore } from './useRunStore';

const ACCURACY_THRESHOLD_M = 20;
const GPS_INTERVAL_MS = 3000;

function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useRunTracker(isActive: boolean) {
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastPointRef = useRef<GPSPoint | null>(null);
  const { incrementDistance, setLastPosition } = useRunStore();

  useEffect(() => {
    if (!isActive) {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      lastPointRef.current = null;
      return;
    }

    let mounted = true;

    async function startTracking() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !mounted) return;

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: GPS_INTERVAL_MS,
          distanceInterval: 5,
        },
        (loc) => {
          if (!mounted) return;
          if (loc.coords.accuracy != null && loc.coords.accuracy > ACCURACY_THRESHOLD_M) return;

          const point: GPSPoint = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? 0,
            timestamp: loc.timestamp,
          };

          pushGPSPoint(point);
          setLastPosition(point.lat, point.lng);

          if (lastPointRef.current) {
            const dist = haversineMeters(
              lastPointRef.current.lat,
              lastPointRef.current.lng,
              point.lat,
              point.lng,
            );
            incrementDistance(dist);
          }

          lastPointRef.current = point;
        },
      );
    }

    startTracking();

    return () => {
      mounted = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [isActive]);
}
