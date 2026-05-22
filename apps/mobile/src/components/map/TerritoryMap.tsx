import React, { useRef, useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import MapboxGL, { UserTrackingMode } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { useTerritoryStore } from '@/features/territory/useTerritoryStore';
import { useRunStore } from '@/features/run/useRunStore';
import { getAllPoints } from '@/features/run/gpsBuffer';
import { ZoneLayer } from './ZoneLayer';
import { CellLayer } from './CellLayer';
import { HeldCellLayer } from './HeldCellLayer';
import { PulseLayer } from './PulseLayer';
import { FogLayer } from './FogLayer';
import { RunnerDot } from './RunnerDot';

// @ts-ignore – Metro replaces process.env at bundle time; TS doesn't know about it
const MAPBOX_TOKEN: string = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
MapboxGL.setAccessToken(MAPBOX_TOKEN);

const GTA_CENTER: [number, number] = [-79.3832, 43.6532];
// Use mapbox:// URI — MapLibre authenticates via setAccessToken above.
// An HTTPS URL with the token as a query param causes a native SIGABRT crash
// in MapLibre's ResourceLoaderT thread when the response can't be parsed.
const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';

interface Props {
  zoneBoundary?: GeoJSON.Polygon | null;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  followUser?: boolean;
  locateTrigger?: number;
}

export function TerritoryMap({
  zoneBoundary = null,
  onBoundsChange,
  followUser = false,
  locateTrigger = 0,
}: Props) {
  const cameraRef = useRef<React.ElementRef<typeof MapboxGL.Camera>>(null);
  const mapRef = useRef<React.ElementRef<typeof MapboxGL.MapView>>(null);
  const userCoordRef = useRef<[number, number] | null>(null);

  const cells = useTerritoryStore((s) => Array.from(s.cells.values()));
  const zones = useTerritoryStore((s) => Array.from(s.zones.values()));
  const presence = useTerritoryStore((s) => Array.from(s.presenceMap.values()));
  const lastPosition = useRunStore((s) => s.lastPosition);
  const activeRun = useRunStore((s) => s.activeRun);

  const [locationGranted, setLocationGranted] = useState(false);
  const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.FeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  });

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      setLocationGranted(status === 'granted');
    });
  }, []);

  useEffect(() => {
    if (!activeRun || !lastPosition) return;
    const coords = getAllPoints().map((p): [number, number] => [p.lng, p.lat]);
    if (coords.length < 2) return;
    setRouteGeoJSON({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }],
    });
  }, [lastPosition, activeRun]);

  useEffect(() => {
    if (locateTrigger === 0) return;
    async function locate() {
      let coord = userCoordRef.current;
      if (!coord) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coord = [loc.coords.longitude, loc.coords.latitude];
          userCoordRef.current = coord;
        } catch {
          return;
        }
      }
      cameraRef.current?.setCamera({ centerCoordinate: coord, zoomLevel: 15, animationDuration: 700 });
    }
    locate();
  }, [locateTrigger]);

  const handleUserLocationUpdate = useCallback((loc: Parameters<NonNullable<React.ComponentProps<typeof MapboxGL.UserLocation>['onUpdate']>>[0]) => {
    userCoordRef.current = [loc.coords.longitude, loc.coords.latitude];
  }, []);

  const handleRegionDidChange = useCallback(async () => {
    if (!mapRef.current || !onBoundsChange) return;
    const bounds = await mapRef.current.getVisibleBounds();
    if (!bounds) return;
    onBoundsChange({ west: bounds[0][0], south: bounds[0][1], east: bounds[1][0], north: bounds[1][1] });
  }, [onBoundsChange]);

  return (
    <MapboxGL.MapView
      ref={mapRef}
      style={styles.map}
      mapStyle={MAP_STYLE}
      onRegionDidChange={handleRegionDidChange}
      compassEnabled={false}
      zoomEnabled
      scrollEnabled
    >
      <MapboxGL.Camera
        ref={cameraRef}
        defaultSettings={{ centerCoordinate: GTA_CENTER, zoomLevel: 14 }}
        followUserLocation={followUser}
        followUserMode={followUser ? UserTrackingMode.Follow : undefined}
        followZoomLevel={followUser ? 16 : undefined}
      />

      {locationGranted && (
        <MapboxGL.UserLocation
          visible
          onUpdate={handleUserLocationUpdate}
          androidRenderMode="normal"
        />
      )}

      <ZoneLayer zones={zones} />
      <CellLayer cells={cells} />
      <HeldCellLayer cells={cells} />
      {lastPosition && <PulseLayer lat={lastPosition.lat} lng={lastPosition.lng} />}
      <FogLayer zoneBoundary={zoneBoundary} />
      <RunnerDot runners={presence} myLat={lastPosition?.lat ?? null} myLng={lastPosition?.lng ?? null} />

      {activeRun && routeGeoJSON.features.length > 0 && (
        <MapboxGL.ShapeSource id="run-route-source" shape={routeGeoJSON}>
          <MapboxGL.LineLayer
            id="run-route-line"
            style={{ lineColor: '#FF3B30', lineWidth: 3, lineOpacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
          />
        </MapboxGL.ShapeSource>
      )}
    </MapboxGL.MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
