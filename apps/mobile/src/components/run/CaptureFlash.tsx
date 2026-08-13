import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

interface Props {
  visible: boolean;
  variant?: 'cell' | 'zone';
}

export function CaptureFlash({ visible, variant = 'cell' }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      // Reset first so re-triggers animate cleanly
      opacity.setValue(0);
      scale.setValue(0.8);
      translateY.setValue(variant === 'zone' ? 0 : 20);

      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
        ...(variant === 'cell'
          ? [Animated.spring(translateY, { toValue: 0, useNativeDriver: true })]
          : []),
      ]).start(() => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          ]).start();
        }, variant === 'zone' ? 1800 : 1200);
      });
    }
  }, [visible]);

  if (variant === 'zone') {
    return (
      <Animated.View style={[styles.zoneOverlay, { opacity }]}>
        <Animated.View style={[styles.zoneBanner, { transform: [{ scale }] }]}>
          <Text style={styles.zoneLabel}>ZONE CAPTURED</Text>
          <View style={styles.zoneDivider} />
          <Text style={styles.zoneSubtitle}>Territory is yours</Text>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.cellPill, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      <Text style={styles.cellText}>CAPTURED</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Cell capture — small pill at top
  cellPill: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
  },
  cellText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 2,
  },

  // Zone capture — full-width banner centered on screen
  zoneOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  zoneBanner: {
    backgroundColor: colors.success,
    paddingHorizontal: 36,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  zoneLabel: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: 3,
  },
  zoneDivider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 1,
    marginVertical: 8,
  },
  zoneSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    fontSize: 13,
    letterSpacing: 1,
  },
});
