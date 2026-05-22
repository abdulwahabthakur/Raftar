import React from 'react';
import MapboxGL from '@maplibre/maplibre-react-native';
import { TerritoryCell } from '@/types';
import { getCellStatus } from '@/features/territory/captureService';
import { colors } from '@/lib/theme';
import { useAuthStore } from '@/features/auth/useAuthStore';

interface Props {
  cells: TerritoryCell[];
}

export function CellLayer({ cells }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? '');

  // Only free cells in this layer (held cells have their own layer)
  const freeCells = cells.filter((c) => getCellStatus(c, userId) === 'free');

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: freeCells.map((c) => ({
      type: 'Feature',
      id: c.id,
      geometry: c.geometry,
      properties: { cellId: c.id },
    })),
  };

  return (
    <MapboxGL.ShapeSource id="cells-free-source" shape={geojson}>
      <MapboxGL.FillLayer
        id="cells-free-fill"
        style={{
          fillColor: colors.cellFree,
          fillOpacity: 0.9,
        }}
      />
      <MapboxGL.LineLayer
        id="cells-free-border"
        style={{
          lineColor: colors.cellBorder,
          lineWidth: 0.5,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
