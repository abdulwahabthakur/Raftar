import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRunStore } from '@/features/run/useRunStore';
import { endRun } from '@/features/run/runService';
import { resetRunCells } from '@/features/territory/captureService';
import { stopPresenceBroadcast } from '@/features/territory/presenceService';
import { colors, spacing, typography } from '@/lib/theme';
import { router } from 'expo-router';

export function EndRunButton() {
  const [loading, setLoading] = useState(false);
  const activeRun = useRunStore((s) => s.activeRun);

  async function handlePress() {
    if (!activeRun || loading) return;

    Alert.alert('End Run?', 'Your progress will be saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Run',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            stopPresenceBroadcast();
            resetRunCells();
            const durationSeconds = Math.round((Date.now() - activeRun.startedAt) / 1000);
            // en-CA locale gives YYYY-MM-DD in the device's local timezone
            const localDate = new Date().toLocaleDateString('en-CA');
            await endRun(activeRun.id, activeRun.distanceMeters, localDate);
            router.replace({
              pathname: '/run/summary',
              params: {
                distance: Math.round(activeRun.distanceMeters),
                duration: durationSeconds,
                cells: activeRun.cellsCaptured,
                skipped: activeRun.cellsSkipped,
                zones: activeRun.zonesCaptured,
              },
            });
          } catch (e: any) {
            console.error('Failed to end run', e);
            Alert.alert('Could not save run', e?.message ?? 'Something went wrong. Please try again.');
            setLoading(false);
          }
        },
      },
    ]);
  }

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.85}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.label}>END RUN</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  label: {
    ...typography.h3,
    color: colors.primary,
    letterSpacing: 1.5,
  },
});
