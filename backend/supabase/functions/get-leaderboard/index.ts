import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VALID_TYPES = ['distance', 'territory', 'domination'] as const;
const VALID_PERIODS = ['today', 'week', 'alltime'] as const;
type BoardType = typeof VALID_TYPES[number];
type Period = typeof VALID_PERIODS[number];

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' };

const r = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET') return r({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return r({ error: 'Missing authorization' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authErr) return r({ error: 'Unauthorized' }, 401);

  const url = new URL(req.url);
  const boardType = (url.searchParams.get('type') ?? 'distance') as BoardType;
  const period = (url.searchParams.get('period') ?? 'week') as Period;
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);

  if (!VALID_TYPES.includes(boardType)) return r({ error: 'Invalid board type' }, 400);
  if (!VALID_PERIODS.includes(period)) return r({ error: 'Invalid period' }, 400);

  // --- Domination: who owns the most cells right now ---
  if (boardType === 'domination') {
    const { data: cells, error } = await supabase
      .from('territory_cells')
      .select('owner_id, users!territory_cells_owner_id_fkey(username, avatar_url)')
      .not('owner_id', 'is', null);

    if (error) return r({ error: error.message }, 500);

    const tally = new Map<string, { username: string; avatarUrl: string | null; count: number }>();
    for (const c of cells ?? []) {
      const u = (c as any).users;
      const prev = tally.get(c.owner_id) ?? { username: u?.username ?? 'Unknown', avatarUrl: u?.avatar_url ?? null, count: 0 };
      prev.count++;
      tally.set(c.owner_id, prev);
    }

    const entries = [...tally.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([userId, d], i) => ({ rank: i + 1, userId, username: d.username, avatarUrl: d.avatarUrl, value: d.count }));

    return r({ boardType, period: 'alltime', entries });
  }

  // --- Distance / Territory: aggregate completed runs ---
  const now = new Date();
  let since: string | null = null;
  if (period === 'today') {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  } else if (period === 'week') {
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  let query = supabase
    .from('runs')
    .select('user_id, distance_meters, cells_captured, users!runs_user_id_fkey(username, avatar_url)')
    .not('ended_at', 'is', null);

  if (since) query = query.gte('started_at', since);

  const { data: runs, error } = await query;
  if (error) return r({ error: error.message }, 500);

  const tally = new Map<string, { username: string; avatarUrl: string | null; value: number }>();
  for (const run of runs ?? []) {
    const u = (run as any).users;
    const delta = boardType === 'distance' ? (run.distance_meters ?? 0) : (run.cells_captured ?? 0);
    const prev = tally.get(run.user_id) ?? { username: u?.username ?? 'Unknown', avatarUrl: u?.avatar_url ?? null, value: 0 };
    prev.value += delta;
    tally.set(run.user_id, prev);
  }

  const entries = [...tally.entries()]
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, limit)
    .map(([userId, d], i) => ({ rank: i + 1, userId, username: d.username, avatarUrl: d.avatarUrl, value: d.value }));

  return r({ boardType, period, entries });
});
