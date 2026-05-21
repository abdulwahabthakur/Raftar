import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { signOut } from '@/features/auth/authService';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/lib/theme';

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

export default function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);

  if (!profile) return null;

  function handleSignOut() {
    Alert.alert('Sign out?', 'You will be returned to the welcome screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{profile.username[0].toUpperCase()}</Text>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.username}>{profile.username}</Text>
            <StreakBadge streak={profile.currentStreak} />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{formatDistance(profile.totalDistanceMeters)}</Text>
            <Text style={styles.statLabel}>TOTAL DISTANCE</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{profile.totalCells.toLocaleString()}</Text>
            <Text style={styles.statLabel}>CELLS CAPTURED</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{profile.totalRuns}</Text>
            <Text style={styles.statLabel}>RUNS</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{profile.longestStreak}</Text>
            <Text style={styles.statLabel}>LONGEST STREAK</Text>
          </Card>
        </View>

        <Button
          label="SIGN OUT"
          onPress={handleSignOut}
          variant="ghost"
          style={styles.signOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: colors.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  username: { ...typography.h2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center' },
  statValue: { ...typography.h2, color: colors.primary },
  statLabel: { ...typography.label, marginTop: 4 },
  signOut: { marginTop: spacing.lg },
});
