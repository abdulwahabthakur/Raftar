import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TerritoryMap } from '@/components/map/TerritoryMap';
import { RunHUD } from '@/components/run/RunHUD';
import { EndRunButton } from '@/components/run/EndRunButton';
import { CaptureFlash } from '@/components/run/CaptureFlash';
import { HeldCellSkip } from '@/components/run/HeldCellSkip';
import { useRunTracker } from '@/features/run/useRunTracker';
import { useRunStore } from '@/features/run/useRunStore';
import { useTerritoryStore } from '@/features/territory/useTerritoryStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useViewportCells, useViewportZones } from '@/features/territory/useViewportCells';
import {
  findCellAtPoint,
  onEnterCell,
  onExitCell,
} from '@/features/territory/captureService';
import {
  startPresenceBroadcast,
  stopPresenceBroadcast,
} from '@/features/territory/presenceService';
import { colors } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

type Bounds = { north: number; south: number; east: number; west: number };

// Refresh cells when runner moves ~250m from the last fetch center (~0.0022 degrees)
const REFETCH_THRESHOLD_DEG = 0.0022;
// Load cells in a ~500m radius around the runner
const CELL_RADIUS_DEG = 0.0045;

export default function ActiveRunScreen() {
  const activeRun = useRunStore((s) => s.activeRun);
  const lastPosition = useRunStore((s) => s.lastPosition);
  const cells = useTerritoryStore((s) => Array.from(s.cells.values()));
  const userId = useAuthStore((s) => s.user?.id ?? '');

  const [captureFlashVisible, setCaptureFlashVisible] = useState(false);
  const [zoneFlashVisible, setZoneFlashVisible] = useState(false);
  const prevCapturedRef = useRef(0);
  const prevZonesRef = useRef(0);
  const currentCellRef = useRef<string | null>(null);

  // Rolling viewport: re-fetch cells every ~250m of movement
  const lastFetchCenter = useRef<{ lat: number; lng: number } | null>(null);
  const [runBounds, setRunBounds] = useState<Bounds | null>(null);

  useViewportCells(runBounds);
  useViewportZones(runBounds);
  useRunTracker(activeRun?.isActive ?? false);

  // Update bounds when GPS moves far enough from the last fetch center
  useEffect(() => {
    if (!lastPosition) return;
    const { lat, lng } = lastPosition;
    const center = lastFetchCenter.current;

    if (center) {
      const dist = Math.sqrt((lat - center.lat) ** 2 + (lng - center.lng) ** 2);
      if (dist < REFETCH_THRESHOLD_DEG) return;
    }

    lastFetchCenter.current = { lat, lng };
    setRunBounds({
      north: lat + CELL_RADIUS_DEG,
      south: lat - CELL_RADIUS_DEG,
      east: lng + CELL_RADIUS_DEG,
      west: lng - CELL_RADIUS_DEG,
    });
  }, [lastPosition]);

  // Start presence broadcast when run is active.
  // Use getState() inside callbacks so they always read current values, not stale closure.
  useEffect(() => {
    if (!activeRun) return;
    startPresenceBroadcast(
      () => useRunStore.getState().lastPosition,
      () => {
        const allCells = Array.from(useTerritoryStore.getState().cells.values());
        return allCells
          .filter((c) => c.ownerId === userId && c.heldUntil !== null)
          .map((c) => c.id);
      },
    );
    return () => stopPresenceBroadcast();
  }, [activeRun?.id]);

  // Detect cell entry/exit on every GPS position change
  useEffect(() => {
    if (!lastPosition || !activeRun) return;

    const cellAtPoint = findCellAtPoint(lastPosition.lat, lastPosition.lng, cells);

    if (cellAtPoint?.id !== currentCellRef.current) {
      if (currentCellRef.current) {
        const prevCell = cells.find((c) => c.id === currentCellRef.current);
        if (prevCell) onExitCell(prevCell);
      }
      if (cellAtPoint) {
        onEnterCell(cellAtPoint, userId, activeRun.id);
      }
      currentCellRef.current = cellAtPoint?.id ?? null;
    }
  }, [lastPosition]);

  // Trigger cell capture flash
  useEffect(() => {
    const captured = activeRun?.cellsCaptured ?? 0;
    if (captured > prevCapturedRef.current) {
      prevCapturedRef.current = captured;
      setCaptureFlashVisible(true);
      setTimeout(() => setCaptureFlashVisible(false), 100);
    }
  }, [activeRun?.cellsCaptured]);

  // Trigger zone capture banner
  useEffect(() => {
    const zones = activeRun?.zonesCaptured ?? 0;
    if (zones > prevZonesRef.current) {
      prevZonesRef.current = zones;
      setZoneFlashVisible(true);
      setTimeout(() => setZoneFlashVisible(false), 100);
    }
  }, [activeRun?.zonesCaptured]);

  return (
    <View style={styles.root}>
      <TerritoryMap followUser />
      <CaptureFlash visible={captureFlashVisible} variant="cell" />
      <CaptureFlash visible={zoneFlashVisible} variant="zone" />
      <HeldCellSkip />
      <SafeAreaView style={styles.hudContainer} edges={['top']}>
        <RunHUD />
      </SafeAreaView>
      <SafeAreaView style={styles.endButton} edges={['bottom']}>
        <EndRunButton />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
  },
  endButton: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
