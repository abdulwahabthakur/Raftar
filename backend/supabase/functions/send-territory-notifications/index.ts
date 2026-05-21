import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const r = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

async function sendExpoPushBatch(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // Expo accepts up to 100 per request
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    });
  }
}

serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Find captures in the last hour that displaced a previous owner
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: thefts } = await supabase
    .from('cell_captures')
    .select(`
      id,
      cell_id,
      user_id,
      previous_owner_id,
      captured_at,
      users!cell_captures_user_id_fkey(username),
      prev_owner:users!cell_captures_previous_owner_id_fkey(id, username, push_token)
    `)
    .gte('captured_at', since)
    .not('previous_owner_id', 'is', null)
    .neq('user_id', 'previous_owner_id');

  const messages: PushMessage[] = [];
  const logEntries = [];

  for (const theft of thefts ?? []) {
    const prevOwner = (theft as any).prev_owner;
    const thief = (theft as any).users;
    if (!prevOwner?.push_token || !prevOwner.push_token.startsWith('ExponentPushToken')) continue;

    messages.push({
      to: prevOwner.push_token,
      title: 'Territory stolen!',
      body: `${thief?.username ?? 'Someone'} captured your cell.`,
      data: { cellId: theft.cell_id, type: 'cell_stolen' },
    });

    logEntries.push({
      user_id: prevOwner.id,
      event_type: 'cell_stolen',
      cell_id: theft.cell_id,
      thief_id: theft.user_id,
      push_success: true,
    });
  }

  await sendExpoPushBatch(messages);

  if (logEntries.length > 0) {
    await supabase.from('notification_log').insert(logEntries);
  }

  return r({ sent: messages.length });
});
