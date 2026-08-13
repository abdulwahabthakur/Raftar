import React from 'react';
import MapboxGL from '@maplibre/maplibre-react-native';
import { Zone } from '@/types';
import { colors } from '@/lib/theme';
import { useAuthStore } from '@/features/auth/useAuthStore';

interface Props {
  zones: Zone[];
}

export function ZoneLayer({ zones }: Props) {
  const userId = useAuthStore((s) => s.user?.id);

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: zones.map((z) => ({
      type: 'Feature',
      id: z.id,
      geometry: z.geometry,
      properties: {
        ownerId: z.ownerId,
        isOwn: z.ownerId === userId,
        isOwned: z.ownerId !== null,
        strength: z.strength ?? 0,
      },
    })),
  };

  return (
    <MapboxGL.ShapeSource id="zones-source" shape={geojson}>
      {/* Fill — color by ownership, opacity scales with zone strength (0.12–0.70) */}
      <MapboxGL.FillLayer
        id="zones-fill"
        style={{
          fillColor: [
            'case',
            ['==', ['get', 'isOwn'], true],  colors.zoneOwned,
            ['==', ['get', 'isOwned'], true], 'rgba(255,149,0,0.55)', // enemy zone = amber
            colors.zoneNeutral,
          ],
          fillOpacity: [
            '+',
            0.12,
            ['*', 0.58, ['/', ['get', 'strength'], 100]],
          ],
        }}
      />
      {/* Border — thicker + color-coded as strength grows (1–3.5 px) */}
      <MapboxGL.LineLayer
        id="zones-border"
        style={{
          lineColor: [
            'case',
            ['==', ['get', 'isOwn'], true],  colors.primary,
            ['==', ['get', 'isOwned'], true], colors.accent,
            colors.cellBorder,
          ],
          lineWidth: ['+', 1, ['*', 2.5, ['/', ['get', 'strength'], 100]]],
          lineOpacity: 0.75,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
