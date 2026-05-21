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

export default function ActiveRunScreen() {
  const activeRun = useRunStore((s) => s.activeRun);
  const lastPosition = useRunStore((s) => s.lastPosition);
  const cells = useTerritoryStore((s) => Array.from(s.cells.values()));
  const userId = useAuthStore((s) => s.user?.id ?? '');

  const [captureFlashVisible, setCaptureFlashVisible] = useState(false);
  const prevCapturedRef = useRef(0);
  const currentCellRef = useRef<string | null>(null);

  useRunTracker(activeRun?.isActive ?? false);

  // Start presence broadcast when run is active
  useEffect(() => {
    if (!activeRun) return;
    startPresenceBroadcast(
      () => lastPosition,
      () => cells.filter((c) => c.ownerId === userId && c.heldUntil !== null).map((c) => c.id),
    );
    return () => stopPresenceBroadcast();
  }, [activeRun?.id]);

  // Detect cell entry/exit from GPS position changes
  useEffect(() => {
    if (!lastPosition || !activeRun) return;

    const cellAtPoint = findCellAtPoint(lastPosition.lat, lastPosition.lng, cells);

    if (cellAtPoint?.id !== currentCellRef.current) {
      // Exited previous cell
      if (currentCellRef.current) {
        const prevCell = cells.find((c) => c.id === currentCellRef.current);
        if (prevCell) onExitCell(prevCell);
      }
      // Entered new cell
      if (cellAtPoint) {
        onEnterCell(cellAtPoint, userId, activeRun.id);
      }
      currentCellRef.current = cellAtPoint?.id ?? null;
    }
  }, [lastPosition]);

  // Show capture flash on new capture
  useEffect(() => {
    const captured = activeRun?.cellsCaptured ?? 0;
    if (captured > prevCapturedRef.current) {
      prevCapturedRef.current = captured;
      setCaptureFlashVisible(true);
      setTimeout(() => setCaptureFlashVisible(false), 100);
    }
  }, [activeRun?.cellsCaptured]);

  return (
    <View style={styles.root}>
      <TerritoryMap />
      <CaptureFlash visible={captureFlashVisible} />
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
