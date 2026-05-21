import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LeaderboardPeriod, LeaderboardType } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'alltime', label: 'All Time' },
];

interface Props {
  active: LeaderboardPeriod;
  onChange: (period: LeaderboardPeriod) => void;
  boardType: LeaderboardType;
}

export function PeriodTabs({ active, onChange, boardType }: Props) {
  // Domination is live-only — no period selector
  if (boardType === 'domination') return null;

  return (
    <View style={styles.container}>
      {PERIODS.map((p) => (
        <TouchableOpacity
          key={p.key}
          style={styles.tab}
          onPress={() => onChange(p.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, active === p.key && styles.activeLabel]}>{p.label}</Text>
          {active === p.key && <View style={styles.indicator} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeLabel: {
    color: colors.textPrimary,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
});
