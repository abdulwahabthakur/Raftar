import React, { useRef, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useTerritoryStore } from '@/features/territory/useTerritoryStore';
import { useRunStore } from '@/features/run/useRunStore';
import { ZoneLayer } from './ZoneLayer';
import { CellLayer } from './CellLayer';
import { HeldCellLayer } from './HeldCellLayer';
import { PulseLayer } from './PulseLayer';
import { FogLayer } from './FogLayer';
import { RunnerDot } from './RunnerDot';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

const GTA_CENTER: [number, number] = [-79.3832, 43.6532];

interface Props {
  zoneBoundary?: GeoJSON.Polygon | null;
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
}

export function TerritoryMap({ zoneBoundary = null, onBoundsChange }: Props) {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);

  const cells = useTerritoryStore((s) => Array.from(s.cells.values()));
  const zones = useTerritoryStore((s) => Array.from(s.zones.values()));
  const presence = useTerritoryStore((s) => Array.from(s.presenceMap.values()));
  const lastPosition = useRunStore((s) => s.lastPosition);

  const handleMapIdle = useCallback(async () => {
    if (!mapRef.current || !onBoundsChange) return;
    const bounds = await mapRef.current.getVisibleBounds();
    if (!bounds) return;
    onBoundsChange({
      west: bounds[0][0],
      south: bounds[0][1],
      east: bounds[1][0],
      north: bounds[1][1],
    });
  }, [onBoundsChange]);

  return (
    <MapboxGL.MapView
      ref={mapRef}
      style={styles.map}
      styleURL={MapboxGL.StyleURL.Dark}
      onMapIdle={handleMapIdle}
      compassEnabled={false}
      scaleBarEnabled={false}
    >
      <MapboxGL.Camera
        ref={cameraRef}
        zoomLevel={14}
        centerCoordinate={
          lastPosition ? [lastPosition.lng, lastPosition.lat] : GTA_CENTER
        }
        animationMode="flyTo"
        animationDuration={300}
      />

      {/* Render order: zones → free cells → held cells → pulse → fog → dots */}
      <ZoneLayer zones={zones} />
      <CellLayer cells={cells} />
      <HeldCellLayer cells={cells} />
      {lastPosition && (
        <PulseLayer lat={lastPosition.lat} lng={lastPosition.lng} />
      )}
      <FogLayer zoneBoundary={zoneBoundary} />
      <RunnerDot
        runners={presence}
        myLat={lastPosition?.lat ?? null}
        myLng={lastPosition?.lng ?? null}
      />
    </MapboxGL.MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
