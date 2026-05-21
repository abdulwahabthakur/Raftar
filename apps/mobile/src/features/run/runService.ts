import { supabase } from '@/lib/supabase';
import { EndRunSchema, StartRunSchema } from '@/lib/schemas';
import { getDeviceId } from '@/lib/storage';
import { getRouteCoordinates, clearBuffer } from './gpsBuffer';
import { useRunStore } from './useRunStore';
import { StartRunResponse, EndRunResponse } from '@/types';

const EDGE_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  };
}

export async function startRun(): Promise<StartRunResponse> {
  const deviceId = await getDeviceId();
  const payload = StartRunSchema.parse({
    startedAt: new Date().toISOString(),
    deviceId,
  });

  const res = await fetch(`${EDGE_BASE}/start-run`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Failed to start run');
  }

  const data: StartRunResponse = await res.json();
  useRunStore.getState().startRun(data.runId);
  return data;
}

export async function endRun(
  runId: string,
  distanceMeters: number,
): Promise<EndRunResponse> {
  const coordinates = getRouteCoordinates();

  const payload = EndRunSchema.parse({
    runId,
    endedAt: new Date().toISOString(),
    distanceMeters,
    route: { type: 'LineString', coordinates },
  });

  const res = await fetch(`${EDGE_BASE}/end-run`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Failed to end run');
  }

  const data: EndRunResponse = await res.json();
  useRunStore.getState().endRun();
  clearBuffer();
  return data;
}
