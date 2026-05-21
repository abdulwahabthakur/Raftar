import { supabase } from '@/lib/supabase';
import { useAuthStore } from './useAuthStore';
import { UserProfile } from '@/types';

export async function initAuth(): Promise<void> {
  const { setSession, setProfile, setLoading } = useAuthStore.getState();

  const { data: { session } } = await supabase.auth.getSession();
  setSession(session);

  if (session?.user) {
    await loadProfile(session.user.id);
  }

  setLoading(false);

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    setSession(newSession);
    if (newSession?.user) {
      await loadProfile(newSession.user.id);
    } else {
      setProfile(null);
    }
  });
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
