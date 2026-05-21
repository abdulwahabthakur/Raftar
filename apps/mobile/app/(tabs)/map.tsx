import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TerritoryMap } from '@/components/map/TerritoryMap';
import { StartRunButton } from '@/components/run/StartRunButton';
import { useRunStore } from '@/features/run/useRunStore';
import { useViewportCells, useViewportZones } from '@/features/territory/useViewportCells';
import { colors } from '@/lib/theme';

type Bounds = { north: number; south: number; east: number; west: number };

export default function MapScreen() {
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const activeRun = useRunStore((s) => s.activeRun);

  useViewportCells(bounds);
  useViewportZones(bounds);

  const handleBoundsChange = useCallback((b: Bounds) => setBounds(b), []);

  function handleRunStarted() {
    router.push('/run/active');
  }

  return (
    <View style={styles.root}>
      <TerritoryMap onBoundsChange={handleBoundsChange} />
      {!activeRun && (
        <SafeAreaView style={styles.buttonContainer} edges={['bottom']}>
          <StartRunButton onStarted={handleRunStarted} />
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
