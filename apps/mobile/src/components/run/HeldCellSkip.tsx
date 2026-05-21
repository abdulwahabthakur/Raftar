import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '@/lib/theme';
import { useRunStore } from '@/features/run/useRunStore';

export function HeldCellSkip() {
  const cellsSkipped = useRunStore((s) => s.activeRun?.cellsSkipped ?? 0);
  const prevSkipped = useRef(cellsSkipped);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (cellsSkipped > prevSkipped.current) {
      prevSkipped.current = cellsSkipped;
      // Brief indicator — no penalty messaging, just neutral info
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(800),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [cellsSkipped]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Text style={styles.text}>Held — skipped</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 164,
    alignSelf: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
  },
  text: {
    color: colors.warning,
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
