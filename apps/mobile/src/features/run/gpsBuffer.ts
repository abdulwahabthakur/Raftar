import { MMKV } from 'react-native-mmkv';
import { GPSPoint } from '@/types';

const storage = new MMKV({ id: 'gps-buffer' });
const BUFFER_KEY = 'gps_points';
const MAX_POINTS = 10_000;

export function pushGPSPoint(point: GPSPoint): void {
  const raw = storage.getString(BUFFER_KEY);
  const points: GPSPoint[] = raw ? JSON.parse(raw) : [];
  points.push(point);
  if (points.length > MAX_POINTS) points.shift();
  storage.set(BUFFER_KEY, JSON.stringify(points));
}

export function getAllPoints(): GPSPoint[] {
  const raw = storage.getString(BUFFER_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getSlice(fromTimestamp: number, toTimestamp: number): GPSPoint[] {
  return getAllPoints().filter(
    (p) => p.timestamp >= fromTimestamp && p.timestamp <= toTimestamp,
  );
}

export function clearBuffer(): void {
  storage.delete(BUFFER_KEY);
}

export function getRouteCoordinates(): [number, number][] {
  return getAllPoints().map((p) => [p.lng, p.lat]);
}
