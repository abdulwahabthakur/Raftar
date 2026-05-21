import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VALID_TYPES = ['distance', 'territory', 'domination'] as const;
const VALID_PERIODS = ['today', 'week', 'alltime'] as const;

type BoardType = typeof VALID_TYPES[number];
type Period = typeof VALID_PERIODS[number];

const r = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

serve(async (req: Request) => {
  if (req.method !== 'GET') return r({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return r({ error: 'Missing authorization' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (authErr) return r({ error: 'Unauthorized' }, 401);

  const url = new URL(req.url);
  const boardType = (url.searchParams.get('type') ?? 'distance') as BoardType;
  const period = (url.searchParams.get('period') ?? 'week') as Period;
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);

  if (!VALID_TYPES.includes(boardType)) return r({ error: 'Invalid board type' }, 400);
  if (!VALID_PERIODS.includes(period)) return r({ error: 'Invalid period' }, 400);

  // domination is live-only — always alltime
  const effectivePeriod: Period = boardType === 'domination' ? 'alltime' : period;

  const { data, error } = await supabase
    .from('leaderboard_cache')
    .select('rank, user_id, value, users(username, avatar_url)')
    .eq('board_type', boardType)
    .eq('period', effectivePeriod)
    .order('rank', { ascending: true })
    .limit(limit);

  if (error) return r({ error: 'Failed to fetch leaderboard' }, 500);

  const entries = data?.map((row: any) => ({
    rank: row.rank,
    userId: row.user_id,
    username: row.users?.username ?? 'Unknown',
    avatarUrl: row.users?.avatar_url ?? null,
    value: row.value,
  })) ?? [];

  return r({ boardType, period: effectivePeriod, entries });
});
