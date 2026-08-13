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

function formatPace(distanceMeters: number, startedAt: number): string {
  if (distanceMeters < 50) return '--\'--"';
  const elapsedSecs = (Date.now() - startedAt) / 1000;
  const secsPerKm = elapsedSecs / (distanceMeters / 1000);
  const m = Math.floor(secsPerKm / 60);
  const s = Math.floor(secsPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

interface StatProps {
  value: string;
  label: string;
  large?: boolean;
}

function Stat({ value, label, large }: StatProps) {
  return (
    <View style={styles.stat}>
      <Text style={large ? styles.valueLg : styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
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
      {/* Row 1 — running metrics */}
      <View style={styles.row}>
        <Stat value={formatDuration(activeRun.startedAt)} label="TIME" large />
        <View style={styles.vDivider} />
        <Stat value={formatDistance(activeRun.distanceMeters)} label="DIST" large />
        <View style={styles.vDivider} />
        <Stat value={formatPace(activeRun.distanceMeters, activeRun.startedAt)} label="PACE /km" large />
      </View>

      {/* Divider */}
      <View style={styles.hDivider} />

      {/* Row 2 — game metrics */}
      <View style={styles.row}>
        <View style={styles.gameMetric}>
          <Text style={styles.gameIcon}>⬡</Text>
          <Text style={styles.gameValue}>{activeRun.cellsCaptured}</Text>
          <Text style={styles.gameLabel}>CELLS</Text>
        </View>
        <View style={styles.vDividerThin} />
        <View style={styles.gameMetric}>
          <Text style={styles.gameIcon}>◈</Text>
          <Text style={styles.gameValue}>{activeRun.zonesCaptured}</Text>
          <Text style={styles.gameLabel}>ZONES</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: 18,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  valueLg: {
    ...typography.h2,
    fontSize: 19,
  },
  value: {
    ...typography.h3,
    fontSize: 16,
  },
  label: {
    ...typography.label,
    marginTop: 1,
    fontSize: 10,
  },
  vDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  hDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  // Game row
  gameMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  gameIcon: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  gameValue: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
  },
  gameLabel: {
    ...typography.label,
    fontSize: 10,
    color: colors.textSecondary,
  },
  vDividerThin: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
});
