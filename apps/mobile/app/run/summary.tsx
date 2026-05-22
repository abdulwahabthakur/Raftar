import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/lib/theme';

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

interface StatRowProps {
  label: string;
  value: string;
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function SummaryScreen() {
  const params = useLocalSearchParams<{
    distance: string;
    duration: string;
    cells: string;
    skipped: string;
    zones: string;
  }>();

  const distance = Number(params.distance ?? 0);
  const duration = Number(params.duration ?? 0);
  const cellsCaptured = Number(params.cells ?? 0);
  const cellsSkipped = Number(params.skipped ?? 0);
  const zonesCaptured = Number(params.zones ?? 0);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Run Complete</Text>
        <Text style={styles.subtitle}>Great work out there.</Text>

        <Card style={styles.card}>
          <StatRow label="Distance" value={formatDistance(distance)} />
          <View style={styles.divider} />
          <StatRow label="Duration" value={formatDuration(duration)} />
          <View style={styles.divider} />
          <StatRow label="Cells Captured" value={String(cellsCaptured)} />
          <View style={styles.divider} />
          <StatRow label="Zones Captured" value={String(zonesCaptured)} />
          {cellsSkipped > 0 && (
            <>
              <View style={styles.divider} />
              <StatRow label="Held Cells Skipped" value={String(cellsSkipped)} />
            </>
          )}
        </Card>

        <Button
          label="BACK TO MAP"
          onPress={() => router.replace('/(tabs)/map')}
          style={styles.cta}
        />
        <Button
          label="View Rankings"
          onPress={() => router.replace('/(tabs)/leaderboard')}
          variant="ghost"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, gap: spacing.lg },
  title: { ...typography.h1, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  card: { gap: spacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { ...typography.body, color: colors.textSecondary },
  statValue: { ...typography.h3 },
  divider: { height: 1, backgroundColor: colors.border },
  cta: { marginTop: spacing.sm },
});
