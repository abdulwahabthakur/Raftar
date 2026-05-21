import React from 'react';
import MapboxGL from '@rnmapbox/maps';
import { RunnerPresence } from '@/types';
import { colors } from '@/lib/theme';

interface Props {
  runners: RunnerPresence[];
  myLat: number | null;
  myLng: number | null;
}

export function RunnerDot({ runners, myLat, myLng }: Props) {
  const otherRunners: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: runners.map((r) => ({
      type: 'Feature',
      id: r.userId,
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
      properties: { username: r.username },
    })),
  };

  const myFeatures: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features:
      myLat !== null && myLng !== null
        ? [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [myLng, myLat] },
              properties: {},
            },
          ]
        : [],
  };

  return (
    <>
      {/* Other runners */}
      <MapboxGL.ShapeSource id="other-runners-source" shape={otherRunners}>
        <MapboxGL.CircleLayer
          id="other-runners-dot"
          style={{
            circleRadius: 7,
            circleColor: colors.accent,
            circleStrokeColor: '#FFFFFF',
            circleStrokeWidth: 1.5,
          }}
        />
      </MapboxGL.ShapeSource>

      {/* Self */}
      <MapboxGL.ShapeSource id="my-dot-source" shape={myFeatures}>
        <MapboxGL.CircleLayer
          id="my-dot"
          style={{
            circleRadius: 9,
            circleColor: colors.primary,
            circleStrokeColor: '#FFFFFF',
            circleStrokeWidth: 2,
          }}
        />
      </MapboxGL.ShapeSource>
    </>
  );
}
