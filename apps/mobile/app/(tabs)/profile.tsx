import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { signOut } from '@/features/auth/authService';
import { supabase } from '@/lib/supabase';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/lib/theme';

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

export default function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  if (!profile) return null;

  async function handleAvatarPress() {
    // Capture non-null ref — profile is confirmed non-null above, but async
    // closures can't rely on the outer narrowing check.
    if (!profile) return;
    const p = profile;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const filePath = `${p.id}/avatar.${ext}`;

    setUploadingAvatar(true);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', p.id);

      setProfile({ ...p, avatarUrl: publicUrl });
    } catch (e) {
      Alert.alert('Upload failed', 'Could not save your photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  }

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
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.75} style={styles.avatarWrapper}>
            {uploadingAvatar ? (
              <View style={styles.avatarCircle}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{profile.username[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>✎</Text>
            </View>
          </TouchableOpacity>

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
  avatarWrapper: { position: 'relative' },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.bgElevated,
  },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: colors.primary },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.bgElevated,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadgeText: { color: colors.textSecondary, fontSize: 13 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  username: { ...typography.h2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center' },
  statValue: { ...typography.h2, color: colors.primary },
  statLabel: { ...typography.label, marginTop: 4 },
  signOut: { marginTop: spacing.lg },
});
