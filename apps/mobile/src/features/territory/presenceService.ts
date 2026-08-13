import { supabase } from '@/lib/supabase';
import { useTerritoryStore } from './useTerritoryStore';
import { useAuthStore } from '../auth/useAuthStore';
import { RunnerPresence } from '@/types';

const BROADCAST_INTERVAL_MS = 8_000;
const STALE_THRESHOLD_MS = 15_000;

// 0.05° grid ≈ 5.5 km cells. Each cell gets its own Realtime channel so
// the global channel never exceeds ~500 concurrent subscribers.
const GRID_SIZE = 0.05;

function getGridKey(lat: number, lng: number): string {
  return `${Math.floor(lat / GRID_SIZE)}_${Math.floor(lng / GRID_SIZE)}`;
}

function channelName(lat: number, lng: number): string {
  return `runner-presence-${getGridKey(lat, lng)}`;
}

let broadcastInterval: ReturnType<typeof setInterval> | null = null;
let presenceChannel: ReturnType<typeof supabase.channel> | null = null;
let activeChannelName: string | null = null;

function subscribeToChannel(
  name: string,
  selfId: string,
): ReturnType<typeof supabase.channel> {
  const ch = supabase.channel(name);
  ch
    .on('broadcast', { event: 'presence' }, ({ payload }: { payload: RunnerPresence }) => {
      if (Date.now() - payload.broadcastAt > STALE_THRESHOLD_MS) return;
      if (payload.userId === selfId) return;
      useTerritoryStore.getState().setPresence(payload);
    })
    .subscribe();
  return ch;
}

export function startPresenceBroadcast(
  getLatLng: () => { lat: number; lng: number } | null,
  getHeldCellIds: () => string[],
): void {
  const { user, profile } = useAuthStore.getState();
  if (!user || !profile) return;

  broadcastInterval = setInterval(() => {
    const pos = getLatLng();
    if (!pos) return;

    const name = channelName(pos.lat, pos.lng);

    // Resubscribe when runner crosses into a new grid cell
    if (name !== activeChannelName) {
      if (presenceChannel) supabase.removeChannel(presenceChannel);
      presenceChannel = subscribeToChannel(name, user.id);
      activeChannelName = name;
    }

    if (!presenceChannel) return;

    const payload: RunnerPresence = {
      userId: user.id,
      username: profile.username,
      lat: pos.lat,
      lng: pos.lng,
      heldCellIds: getHeldCellIds(),
      broadcastAt: Date.now(),
    };

    presenceChannel.send({ type: 'broadcast', event: 'presence', payload });
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
  activeChannelName = null;

  const { presenceMap, removePresence } = useTerritoryStore.getState();
  presenceMap.forEach((_, uid) => removePresence(uid));
}
