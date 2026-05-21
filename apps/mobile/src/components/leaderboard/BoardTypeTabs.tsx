import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LeaderboardType } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

const TABS: { key: LeaderboardType; label: string }[] = [
  { key: 'distance', label: 'Distance' },
  { key: 'territory', label: 'Territory' },
  { key: 'domination', label: 'Domination' },
];

interface Props {
  active: LeaderboardType;
  onChange: (type: LeaderboardType) => void;
}

export function BoardTypeTabs({ active, onChange }: Props) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, active === tab.key && styles.activeTab]}
          onPress={() => onChange(tab.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, active === tab.key && styles.activeLabel]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 3,
    marginHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeLabel: {
    color: '#fff',
  },
});
