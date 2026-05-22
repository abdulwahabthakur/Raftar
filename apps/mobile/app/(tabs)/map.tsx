import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TerritoryMap } from '@/components/map/TerritoryMap';
import { StartRunButton } from '@/components/run/StartRunButton';
import { useRunStore } from '@/features/run/useRunStore';
import { useViewportCells, useViewportZones } from '@/features/territory/useViewportCells';
import { colors } from '@/lib/theme';

type Bounds = { north: number; south: number; east: number; west: number };

export default function MapScreen() {
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const activeRun = useRunStore((s) => s.activeRun);

  useViewportCells(bounds);
  useViewportZones(bounds);

  const handleBoundsChange = useCallback((b: Bounds) => setBounds(b), []);

  function handleRunStarted() {
    router.push('/run/active');
  }

  return (
    <View style={styles.root}>
      <TerritoryMap onBoundsChange={handleBoundsChange} locateTrigger={locateTrigger} />

      {/* Locate-me button */}
      <TouchableOpacity style={styles.locateBtn} onPress={() => setLocateTrigger((n) => n + 1)} activeOpacity={0.8}>
        <Ionicons name="locate" size={22} color={colors.primary} />
      </TouchableOpacity>

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
  locateBtn: {
    position: 'absolute',
    bottom: 160,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
