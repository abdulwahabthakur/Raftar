import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { startRun } from '@/features/run/runService';
import { colors, spacing, typography } from '@/lib/theme';

interface Props {
  onStarted?: () => void;
}

export function StartRunButton({ onStarted }: Props) {
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    if (loading) return;
    setLoading(true);
    try {
      await startRun();
      onStarted?.();
    } catch (e) {
      console.error('Failed to start run', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.85}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.label}>START RUN</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  label: {
    ...typography.h3,
    letterSpacing: 1.5,
  },
});
