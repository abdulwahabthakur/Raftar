import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/features/auth/useAuthStore';

export default function AuthLayout() {
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    if (session) router.replace('/(tabs)/map');
  }, [session]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
