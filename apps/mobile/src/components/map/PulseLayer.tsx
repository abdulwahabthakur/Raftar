import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

interface Props {
  lat: number;
  lng: number;
  color?: string;
}

export function PulseLayer({ lat, lng, color = '#FF3B30' }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 2.5, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {},
      },
    ],
  };

  return (
    <MapboxGL.ShapeSource id="pulse-source" shape={geojson}>
      <MapboxGL.CircleLayer
        id="pulse-ring"
        style={{
          circleRadius: 24,
          circleColor: 'transparent',
          circleStrokeColor: color,
          circleStrokeWidth: 2,
          circleOpacity: 0.6,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
