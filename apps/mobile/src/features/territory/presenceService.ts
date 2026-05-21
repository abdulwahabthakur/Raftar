import { supabase } from '@/lib/supabase';
import { useTerritoryStore } from './useTerritoryStore';
import { useAuthStore } from '../auth/useAuthStore';
import { RunnerPresence } from '@/types';

const CHANNEL_NAME = 'runner-presence-gta';
const BROADCAST_INTERVAL_MS = 8_000;
const STALE_THRESHOLD_MS = 15_000;

let broadcastInterval: ReturnType<typeof setInterval> | null = null;
let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

export function startPresenceBroadcast(
  getLatLng: () => { lat: number; lng: number } | null,
  getHeldCellIds: () => string[],
): void {
  const { user, profile } = useAuthStore.getState();
  if (!user || !profile) return;

  presenceChannel = supabase.channel(CHANNEL_NAME);

  presenceChannel
    .on('broadcast', { event: 'presence' }, ({ payload }: { payload: RunnerPresence }) => {
      const now = Date.now();
      if (now - payload.broadcastAt > STALE_THRESHOLD_MS) return; // discard stale
      if (payload.userId === user.id) return; // ignore self

      useTerritoryStore.getState().setPresence(payload);
    })
    .subscribe();

  broadcastInterval = setInterval(() => {
    const pos = getLatLng();
    if (!pos || !presenceChannel) return;

    const payload: RunnerPresence = {
      userId: user.id,
      username: profile.username,
      lat: pos.lat,
      lng: pos.lng,
      heldCellIds: getHeldCellIds(),
      broadcastAt: Date.now(),
    };

    presenceChannel.send({
      type: 'broadcast',
      event: 'presence',
      payload,
    });
  }, BROADCAST_INTERVAL_MS);
}

export function stopPresenceBroadcast(): void {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }
  if (presenceChannel) {
    supabase.removeChannel(presenceChannel);
    presenceChannel = null;
  }
  // Clear all other runners from the map
  useTerritoryStore.getState().presenceMap.forEach((_, userId) => {
    useTerritoryStore.getState().removePresence(userId);
  });
}
