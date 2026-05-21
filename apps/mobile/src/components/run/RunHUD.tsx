import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRunStore } from '@/features/run/useRunStore';
import { colors, spacing, typography } from '@/lib/theme';

function formatDuration(startedAt: number): string {
  const secs = Math.floor((Date.now() - startedAt) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

export function RunHUD() {
  const activeRun = useRunStore((s) => s.activeRun);
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    const interval = setInterval(forceUpdate, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!activeRun) return null;

  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Text style={styles.value}>{formatDuration(activeRun.startedAt)}</Text>
        <Text style={styles.label}>TIME</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stat}>
        <Text style={styles.value}>{formatDistance(activeRun.distanceMeters)}</Text>
        <Text style={styles.label}>DISTANCE</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stat}>
        <Text style={styles.value}>{activeRun.cellsCaptured}</Text>
        <Text style={styles.label}>CELLS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  value: {
    ...typography.h2,
    fontSize: 20,
  },
  label: {
    ...typography.label,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
});
