import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const GPSPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0),
  timestamp: z.number().int().positive(),
});

const SubmitCaptureSchema = z.object({
  runId: z.string().uuid(),
  cellId: z.string().uuid(),
  enteredAt: z.string().datetime(),
  exitedAt: z.string().datetime(),
  gpsSlice: z.array(GPSPointSchema).min(2).max(50),
  deviceId: z.string().min(1).max(128),
});

const SPEED_LIMIT_KMH = 30;
const MIN_DWELL_SECS = 18;
const REPLAY_WINDOW_SECS = 120;
const HOLD_DURATION_MS = 60 * 60 * 1000; // 1 hour

const r = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function maxSpeedKmh(gpsSlice: z.infer<typeof GPSPointSchema>[]): number {
  let maxSpeed = 0;
  for (let i = 1; i < gpsSlice.length; i++) {
    const prev = gpsSlice[i - 1];
    const curr = gpsSlice[i];
    const distKm = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
    const timeSecs = (curr.timestamp - prev.timestamp) / 1000;
    if (timeSecs > 0) maxSpeed = Math.max(maxSpeed, (distKm / timeSecs) * 3600);
  }
  return maxSpeed;
}

serve(async (req: Request) => {
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
  const parsed = SubmitCaptureSchema.safeParse(body);
  if (!parsed.success) return r({ error: 'Invalid payload', details: parsed.error.format() }, 422);

  const { runId, cellId, enteredAt, exitedAt, gpsSlice, deviceId } = parsed.data;

  // Verify run ownership and is still active
  const { data: run } = await supabase
    .from('runs')
    .select('id, user_id, started_at')
    .eq('id', runId)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .single();

  if (!run) return r({ error: 'Run not found or not active' }, 404);

  // Fetch cell — include zone_id for zone dominance check after capture
  const { data: cell } = await supabase
    .from('territory_cells')
    .select('id, zone_id, owner_id, held_until')
    .eq('id', cellId)
    .single();

  if (!cell) return r({ error: 'Cell not found' }, 404);

  // Server-side held check
  if (cell.held_until && new Date(cell.held_until) > new Date()) {
    return r({ error: 'Cell is currently held', heldUntil: cell.held_until }, 409);
  }

  // Anti-cheat: dwell time
  const enteredMs = new Date(enteredAt).getTime();
  const exitedMs = new Date(exitedAt).getTime();
  const timeInsideSecs = (exitedMs - enteredMs) / 1000;

  if (timeInsideSecs < MIN_DWELL_SECS) {
    await supabase.from('anticheat_log').insert({
      user_id: user.id,
      run_id: runId,
      event_type: 'dwell_too_short',
      suspicion_score: 10,
      metadata: { timeInsideSecs, cellId },
    });
    await supabase.rpc('increment_user_suspicion', { p_user_id: user.id, p_score: 10 });
    return r({ error: 'Insufficient dwell time' }, 422);
  }

  // Anti-cheat: speed check
  const speed = maxSpeedKmh(gpsSlice);
  if (speed > SPEED_LIMIT_KMH) {
    await supabase.from('anticheat_log').insert({
      user_id: user.id,
      run_id: runId,
      event_type: 'speed_violation',
      suspicion_score: 30,
      metadata: { maxSpeedKmh: speed, cellId, deviceId },
    });
    await supabase.rpc('increment_user_suspicion', { p_user_id: user.id, p_score: 30 });
    return r({ error: 'Speed violation detected' }, 422);
  }

  // Anti-cheat: replay rejection
  const { data: recentCapture } = await supabase
    .from('cell_captures')
    .select('id')
    .eq('cell_id', cellId)
    .eq('user_id', user.id)
    .gte('captured_at', new Date(enteredMs - REPLAY_WINDOW_SECS * 1000).toISOString())
    .limit(1)
    .single();

  if (recentCapture) {
    await supabase.from('anticheat_log').insert({
      user_id: user.id,
      run_id: runId,
      event_type: 'replay_attempt',
      suspicion_score: 20,
      metadata: { cellId, priorCaptureId: recentCapture.id },
    });
    return r({ error: 'Duplicate capture rejected' }, 409);
  }

  const heldUntil = new Date(Date.now() + HOLD_DURATION_MS).toISOString();

  // Write capture log
  const { error: captureErr } = await supabase.from('cell_captures').insert({
    cell_id: cellId,
    user_id: user.id,
    run_id: runId,
    previous_owner_id: cell.owner_id,
    entered_at: enteredAt,
    exited_at: exitedAt,
  });

  if (captureErr) return r({ error: 'Failed to record capture' }, 500);

  // Update cell ownership and set 1-hour hold
  await supabase
    .from('territory_cells')
    .update({ owner_id: user.id, owned_at: new Date().toISOString(), held_until: heldUntil })
    .eq('id', cellId);

  // Atomic increments + zone dominance check in parallel
  const [, , , zoneResult] = await Promise.all([
    supabase.rpc('increment_cell_capture_count', { p_cell_id: cellId }),
    supabase.rpc('increment_run_cells_captured', { p_run_id: runId }),
    supabase.rpc('increment_user_cell_count', { p_user_id: user.id }),
    // Check if user now dominates the zone (>= 50% of cells) and update ownership
    cell.zone_id
      ? supabase.rpc('check_zone_dominance', {
          p_zone_id: cell.zone_id,
          p_user_id: user.id,
          p_run_id: runId,
        })
      : Promise.resolve({ data: null }),
  ]);

  const zoneCaptured = (zoneResult?.data as any)?.zone_captured ?? false;

  return r({ captured: true, heldUntil, zoneCaptured, zoneId: cell.zone_id ?? null });
});
