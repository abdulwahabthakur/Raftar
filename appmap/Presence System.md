# Presence System

Real-time visibility of other active runners on the map during a run.

---

## How It Works

When a run starts, the app joins a Supabase Realtime broadcast channel and begins broadcasting its position every 8 seconds. It also listens for position broadcasts from other runners and renders them on the map.

---

## Implementation — `presenceService.ts`

**File:** `apps/mobile/src/features/territory/presenceService.ts`

### Constants
```ts
const CHANNEL_NAME = 'runner-presence-gta';   // one channel for all GTA runners
const BROADCAST_INTERVAL_MS = 8_000;          // broadcast own position every 8 s
const STALE_THRESHOLD_MS = 15_000;            // discard packets older than 15 s
```

### `startPresenceBroadcast(getLatLng, getHeldCellIds)`

Called from `active.tsx` when a run starts.

1. Creates a Supabase Realtime channel: `supabase.channel('runner-presence-gta')`
2. **Listens** for `broadcast` events with event type `'presence'`
   - Discards packets with `broadcastAt > 15 s` ago (stale)
   - Discards own packets (`payload.userId === user.id`)
   - Writes other runners to `useTerritoryStore.setPresence(payload)`
3. **Broadcasts** own position every 8 seconds via `setInterval`:
   - Calls `getLatLng()` — callback gets current position from `useRunStore`
   - Calls `getHeldCellIds()` — callback returns runner's currently held cell IDs
   - Sends `RunnerPresence` payload to the channel

### `stopPresenceBroadcast()`

Called from `active.tsx` cleanup when a run ends.
1. Clears the broadcast interval
2. Removes the Supabase Realtime channel subscription
3. Clears all other runners from `useTerritoryStore.presenceMap`

---

## The `RunnerPresence` Payload

```ts
interface RunnerPresence {
  userId: string;
  username: string;
  lat: number;
  lng: number;
  heldCellIds: string[];   // cells this runner currently holds
  broadcastAt: number;     // epoch ms — for staleness check
}
```

`heldCellIds` is included so the map can potentially show which cells are actively in contention by a nearby runner.

---

## Storage in `useTerritoryStore`

```ts
presenceMap: Map<userId, RunnerPresence>

setPresence(presence)   // upserts by userId
removePresence(userId)  // used on cleanup
```

The `RunnerDot` map component reads from `presenceMap` and renders a dot for each other runner at their last known position.

---

## Staleness Handling

Every 8-second broadcast includes `broadcastAt: Date.now()`. The receiver checks:
```ts
if (now - payload.broadcastAt > 15_000) return; // discard stale
```

This means if a runner's phone dies or they exit the app, their dot disappears from other runners' maps within 15 seconds of the last broadcast.

---

## Channel Scope

All runners in the GTA use a single channel `'runner-presence-gta'`. This means:
- All runners can see all other runners anywhere in GTA (not just nearby)
- At scale, this broadcast could become noisy — future optimization would be spatial fan-out by sub-zone

---

## See Also
- [[Run Engine]] — `useRunStore.lastPosition` is the source of the broadcast position
- [[Map Components]] — `RunnerDot` renders the presence data
- [[Data Types]] — `RunnerPresence` interface
