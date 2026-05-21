import React from 'react';
import MapboxGL from '@rnmapbox/maps';
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
        strength: z.strength,
      },
    })),
  };

  return (
    <MapboxGL.ShapeSource id="zones-source" shape={geojson}>
      <MapboxGL.FillLayer
        id="zones-fill"
        style={{
          fillColor: [
            'case',
            ['==', ['get', 'isOwn'], true],
            colors.zoneOwned,
            colors.zoneNeutral,
          ],
          fillOpacity: 0.7,
        }}
      />
      <MapboxGL.LineLayer
        id="zones-border"
        style={{
          lineColor: colors.cellBorder,
          lineWidth: 1.5,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
