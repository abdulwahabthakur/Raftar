import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LeaderboardEntry, LeaderboardType, LeaderboardPeriod } from '@/types';

const EDGE_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';

async function fetchLeaderboard(
  boardType: LeaderboardType,
  period: LeaderboardPeriod,
): Promise<LeaderboardEntry[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const effectivePeriod = boardType === 'domination' ? 'alltime' : period;

  const res = await fetch(
    `${EDGE_BASE}/get-leaderboard?type=${boardType}&period=${effectivePeriod}&limit=50`,
    {
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
    },
  );

  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  const data = await res.json();
  return data.entries ?? [];
}

export function useLeaderboard(boardType: LeaderboardType, period: LeaderboardPeriod) {
  return useQuery({
    queryKey: ['leaderboard', boardType, period],
    queryFn: () => fetchLeaderboard(boardType, period),
    staleTime: 5 * 60 * 1000, // 5 minutes — matches server refresh interval
    refetchInterval: 5 * 60 * 1000,
  });
}
