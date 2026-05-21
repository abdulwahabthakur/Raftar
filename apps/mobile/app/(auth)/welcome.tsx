import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { signIn, signUp } from '@/features/auth/authService';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/lib/theme';

export default function WelcomeScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (loading) return;
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) Alert.alert('Sign in failed', error);
      } else {
        if (username.length < 3) {
          Alert.alert('Invalid username', 'Username must be at least 3 characters.');
          return;
        }
        const { error } = await signUp(email, password, username);
        if (error) Alert.alert('Sign up failed', error);
        else router.replace('/(auth)/onboarding');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>RAFTAR</Text>
          <Text style={styles.tagline}>Conquer your city, one block at a time.</Text>
        </View>

        <View style={styles.form}>
          {mode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.textTertiary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            label={mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.cta}
          />

          <Button
            label={mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            variant="ghost"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  header: { alignItems: 'center', marginBottom: spacing.xxl },
  logo: { fontSize: 48, fontWeight: '900', color: colors.primary, letterSpacing: 8 },
  tagline: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  form: { gap: spacing.md },
  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
  },
  cta: { marginTop: spacing.sm },
});
