import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useLocationPermission } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/lib/theme';

export default function OnboardingScreen() {
  const { status, requestPermission } = useLocationPermission();

  async function handleContinue() {
    if (status !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }
    router.replace('/(tabs)/map');
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.heading}>One permission,{'\n'}unlimited territory.</Text>
        <Text style={styles.body}>
          Raftar tracks your runs while the app is open to capture city blocks.
          We never track your location in the background.
        </Text>
        <View style={styles.feature}>
          <Text style={styles.bullet}>📍</Text>
          <Text style={styles.featureText}>Location used only during active runs</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.bullet}>🔒</Text>
          <Text style={styles.featureText}>Stops the moment you close the app</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.bullet}>🇨🇦</Text>
          <Text style={styles.featureText}>Data stored in Canada</Text>
        </View>
      </View>
      <Button
        label={status === 'granted' ? "LET'S GO" : 'ALLOW LOCATION'}
        onPress={handleContinue}
        style={styles.cta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  heading: { ...typography.h1, fontSize: 32, lineHeight: 40 },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  feature: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  bullet: { fontSize: 20 },
  featureText: { ...typography.body, flex: 1 },
  cta: { marginBottom: spacing.xl },
});
