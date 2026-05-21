import React from 'react';
import MapboxGL from '@rnmapbox/maps';
import { colors } from '@/lib/theme';

interface Props {
  zoneBoundary: GeoJSON.Polygon | null;
}

export function FogLayer({ zoneBoundary }: Props) {
  if (!zoneBoundary) return null;

  // World polygon minus the zone — everything outside the active zone is fogged
  const worldPolygon: GeoJSON.Polygon = {
    type: 'Polygon',
    coordinates: [
      [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]],
      ...zoneBoundary.coordinates,
    ],
  };

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: worldPolygon, properties: {} }],
  };

  return (
    <MapboxGL.ShapeSource id="fog-source" shape={geojson}>
      <MapboxGL.FillLayer
        id="fog-fill"
        style={{
          fillColor: colors.fog,
          fillOpacity: 1,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
