import { supabase } from '@/lib/supabase';
import { useAuthStore } from './useAuthStore';
import { UserProfile } from '@/types';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const EAS_PROJECT_ID = 'f3e3a02d-072e-4a6d-9acf-c7a0467f3d4f';

export async function initAuth(): Promise<void> {
  const { setSession, setProfile, setLoading } = useAuthStore.getState();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);

    if (session?.user) {
      await loadProfile(session.user.id);
    }
  } finally {
    setLoading(false);
  }

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    setSession(newSession);
    if (newSession?.user) {
      await loadProfile(newSession.user.id);
    } else {
      setProfile(null);
    }
  });
}

async function registerPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return; // emulators can't receive push notifications

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });

    await supabase.from('users').update({ push_token: token }).eq('id', userId);
  } catch {
    // Non-fatal — app works without push tokens
  }
}

export async function loadProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  const profile: UserProfile = {
    id: data.id,
    username: data.username,
    avatarUrl: data.avatar_url,
    totalDistanceMeters: data.total_distance_meters,
    totalCells: data.total_cells,
    totalRuns: data.total_runs,
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    createdAt: data.created_at,
  };

  useAuthStore.getState().setProfile(profile);
  // Fire-and-forget — register/refresh push token after every sign-in
  registerPushToken(userId);
  return profile;
}

export async function signUp(
  email: string,
  password: string,
  username: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  return { error: error?.message ?? null };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  useAuthStore.getState().reset();
}
