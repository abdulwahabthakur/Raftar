import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const EndRunSchema = z.object({
  runId: z.string().uuid(),
  endedAt: z.string().datetime(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  distanceMeters: z.number().min(0),
  route: z.object({
    type: z.literal('LineString'),
    coordinates: z.array(z.tuple([z.number(), z.number()])).min(0),
  }),
});

const r = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  if (req.method !== 'POST') return r({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return r({ error: 'Missing authorization' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (authErr || !user) return r({ error: 'Unauthorized' }, 401);

  const body = await req.json().catch(() => null);
  const parsed = EndRunSchema.safeParse(body);
  if (!parsed.success) return r({ error: 'Invalid payload', details: parsed.error.format() }, 422);

  const { runId, endedAt, localDate, distanceMeters, route } = parsed.data;
  // Use device-local date for streak so a runner at 11 PM local time isn't credited to the next UTC day
  const runDate = localDate ?? endedAt.split('T')[0];

  const { data: run, error: findErr } = await supabase
    .from('runs')
    .select('id, started_at, user_id')
    .eq('id', runId)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .single();

  if (findErr || !run) return r({ error: 'Run not found or already ended' }, 404);

  const durationSeconds = Math.round(
    (new Date(endedAt).getTime() - new Date(run.started_at).getTime()) / 1000,
  );

  // Only write PostGIS LINESTRING if we have >= 2 GPS points
  const routeUpdate = route.coordinates.length >= 2
    ? { route: `SRID=4326;LINESTRING(${route.coordinates.map(([lng, lat]) => `${lng} ${lat}`).join(',')})` }
    : {};

  const { data: updated, error: updateErr } = await supabase
    .from('runs')
    .update({
      ended_at: endedAt,
      distance_meters: distanceMeters,
      duration_seconds: durationSeconds,
      ...routeUpdate,
    })
    .eq('id', runId)
    .select('id, user_id, started_at, ended_at, distance_meters, duration_seconds, cells_captured, cells_skipped, zones_captured')
    .single();

  if (updateErr) return r({ error: `Failed to end run: ${updateErr.message}` }, 500);

  await Promise.all([
    supabase.rpc('update_streak', { p_user_id: user.id, p_run_date: runDate }),
    supabase.rpc('increment_user_run_stats', { p_user_id: user.id, p_distance_meters: Math.round(distanceMeters) }),
  ]);

  // Refresh leaderboard cache synchronously so rankings update immediately after a run
  await supabase.rpc('refresh_leaderboard_cache').catch(() => null);

  return r({ run: updated });
});
