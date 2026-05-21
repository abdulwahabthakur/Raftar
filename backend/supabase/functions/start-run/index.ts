import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const StartRunSchema = z.object({
  startedAt: z.string().datetime(),
  deviceId: z.string().min(1).max(128),
});

const r = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

serve(async (req: Request) => {
  if (req.method !== 'POST') return r({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return r({ error: 'Missing authorization' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verify JWT and get user
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (authErr || !user) return r({ error: 'Unauthorized' }, 401);

  // Validate body
  const body = await req.json().catch(() => null);
  const parsed = StartRunSchema.safeParse(body);
  if (!parsed.success) return r({ error: 'Invalid payload', details: parsed.error.format() }, 422);

  const { startedAt } = parsed.data;

  // Check no active run exists
  const { data: activeRun } = await supabase
    .from('runs')
    .select('id')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .single();

  if (activeRun) return r({ error: 'Run already in progress', runId: activeRun.id }, 409);

  const { data: run, error } = await supabase
    .from('runs')
    .insert({ user_id: user.id, started_at: startedAt })
    .select('id, started_at')
    .single();

  if (error) return r({ error: 'Failed to start run' }, 500);

  return r({ runId: run.id, startedAt: run.started_at });
});
