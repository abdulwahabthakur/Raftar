import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LeaderRow } from './LeaderRow';
import { LeaderboardEntry, LeaderboardType } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

interface Props {
  entries: LeaderboardEntry[];
  boardType: LeaderboardType;
  isLoading: boolean;
  error: Error | null;
}

export function LeaderboardList({ entries, boardType, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={typography.caption}>Failed to load leaderboard.</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={typography.caption}>No entries yet. Go run!</Text>
      </View>
    );
  }

  return (
    <FlashList
      data={entries}
      keyExtractor={(item) => item.userId}
      renderItem={({ item }) => <LeaderRow entry={item} boardType={boardType} />}
      estimatedItemSize={60}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
});
