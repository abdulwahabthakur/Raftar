import { Redirect } from 'expo-router';
import { useAuthStore } from '@/features/auth/useAuthStore';

export default function Index() {
  const session = useAuthStore((s) => s.session);
  return <Redirect href={session ? '/(tabs)/map' : '/(auth)/welcome'} />;
}
