import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@/lib/theme';

interface Props {
  streak: number;
}

export function StreakBadge({ streak }: Props) {
  if (streak < 2) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.icon}>🔥</Text>
      <Text style={styles.count}>{streak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDim,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    gap: 3,
  },
  icon: {
    fontSize: 13,
  },
  count: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
