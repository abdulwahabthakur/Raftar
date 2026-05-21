import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LeaderboardEntry, LeaderboardType } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

interface Props {
  entry: LeaderboardEntry;
  boardType: LeaderboardType;
}

function formatValue(value: number, boardType: LeaderboardType): string {
  if (boardType === 'distance') {
    return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
  }
  return String(value);
}

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

export function LeaderRow({ entry, boardType }: Props) {
  const rankColor = RANK_COLORS[entry.rank] ?? colors.textSecondary;

  return (
    <View style={styles.row}>
      <Text style={[styles.rank, { color: rankColor }]}>
        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
      </Text>
      {entry.avatarUrl ? (
        <Image source={{ uri: entry.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]} />
      )}
      <Text style={styles.username} numberOfLines={1}>
        {entry.username}
      </Text>
      <Text style={styles.value}>{formatValue(entry.value, boardType)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  rank: {
    width: 32,
    ...typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: colors.border,
  },
  username: {
    flex: 1,
    ...typography.body,
    fontWeight: '600',
  },
  value: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});
