import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLeaderboard } from '@/features/leaderboard/useLeaderboard';
import { LeaderboardList } from '@/components/leaderboard/LeaderboardList';
import { BoardTypeTabs } from '@/components/leaderboard/BoardTypeTabs';
import { PeriodTabs } from '@/components/leaderboard/PeriodTabs';
import { LeaderboardType, LeaderboardPeriod } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

export default function LeaderboardScreen() {
  const [boardType, setBoardType] = useState<LeaderboardType>('distance');
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');

  const { data, isLoading, error } = useLeaderboard(boardType, period);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.title}>Rankings</Text>
      <BoardTypeTabs active={boardType} onChange={setBoardType} />
      <PeriodTabs active={period} onChange={setPeriod} boardType={boardType} />
      <LeaderboardList
        entries={data ?? []}
        boardType={boardType}
        isLoading={isLoading}
        error={error}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { ...typography.h1, margin: spacing.md },
});
