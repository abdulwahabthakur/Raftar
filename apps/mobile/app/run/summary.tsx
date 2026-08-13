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

function formatPace(distanceMeters: number, durationSeconds: number): string {
  if (distanceMeters < 50) return 'N/A';
  const secsPerKm = durationSeconds / (distanceMeters / 1000);
  const m = Math.floor(secsPerKm / 60);
  const s = Math.floor(secsPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}" /km`;
}

interface HeroStatProps {
  value: string;
  label: string;
}

function HeroStat({ value, label }: HeroStatProps) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroValue}>{value}</Text>
      <Text style={styles.heroLabel}>{label}</Text>
    </View>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  accent?: boolean;
}

function StatRow({ label, value, accent }: StatRowProps) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
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

        {/* Hero stats — distance + pace side by side */}
        <View style={styles.heroRow}>
          <HeroStat value={formatDistance(distance)} label="Distance" />
          <View style={styles.heroDivider} />
          <HeroStat value={formatPace(distance, duration)} label="Avg Pace" />
        </View>

        {/* Run breakdown */}
        <Card style={styles.card}>
          <StatRow label="Duration" value={formatDuration(duration)} />
          <View style={styles.divider} />
          <StatRow label="Cells Captured" value={String(cellsCaptured)} />
          {zonesCaptured > 0 && (
            <>
              <View style={styles.divider} />
              <StatRow label="Zones Captured" value={String(zonesCaptured)} accent />
            </>
          )}
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

  heroRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: 18,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  heroStat: { alignItems: 'center', flex: 1 },
  heroValue: { ...typography.h1, fontSize: 30, color: colors.primary },
  heroLabel: { ...typography.label, marginTop: 4, fontSize: 11 },
  heroDivider: { width: 1, height: 44, backgroundColor: colors.border },

  card: { gap: spacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { ...typography.body, color: colors.textSecondary },
  statValue: { ...typography.h3 },
  statValueAccent: { color: colors.success },
  divider: { height: 1, backgroundColor: colors.border },
  cta: { marginTop: spacing.sm },
});
