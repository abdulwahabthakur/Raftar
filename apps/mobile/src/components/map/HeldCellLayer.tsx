import React from 'react';
import MapboxGL from '@maplibre/maplibre-react-native';
import { TerritoryCell } from '@/types';
import { getCellStatus } from '@/features/territory/captureService';
import { colors } from '@/lib/theme';
import { useAuthStore } from '@/features/auth/useAuthStore';

interface Props {
  cells: TerritoryCell[];
}

export function HeldCellLayer({ cells }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? '');

  const heldByOthers = cells.filter((c) => getCellStatus(c, userId) === 'held');
  const heldByMe = cells.filter((c) => getCellStatus(c, userId) === 'mine');

  const makeGeoJSON = (subset: TerritoryCell[]): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: subset.map((c) => ({
      type: 'Feature',
      id: c.id,
      geometry: c.geometry,
      properties: { cellId: c.id },
    })),
  });

  return (
    <>
      {/* Cells held by other players — orange */}
      <MapboxGL.ShapeSource id="cells-held-source" shape={makeGeoJSON(heldByOthers)}>
        <MapboxGL.FillLayer
          id="cells-held-fill"
          style={{ fillColor: colors.cellHeld, fillOpacity: 0.85 }}
        />
        <MapboxGL.LineLayer
          id="cells-held-border"
          style={{ lineColor: colors.warning, lineWidth: 1 }}
        />
      </MapboxGL.ShapeSource>

      {/* Cells held by me — red */}
      <MapboxGL.ShapeSource id="cells-mine-source" shape={makeGeoJSON(heldByMe)}>
        <MapboxGL.FillLayer
          id="cells-mine-fill"
          style={{ fillColor: colors.cellMine, fillOpacity: 0.85 }}
        />
        <MapboxGL.LineLayer
          id="cells-mine-border"
          style={{ lineColor: colors.primary, lineWidth: 1 }}
        />
      </MapboxGL.ShapeSource>
    </>
  );
}
