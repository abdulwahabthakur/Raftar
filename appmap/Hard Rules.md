# Hard Rules

These are non-negotiable constraints. They must never be violated in any code change.

---

## Storage

**NEVER use AsyncStorage.**
Use `expo-secure-store` for all persistent key-value storage.
The GPS buffer uses `react-native-mmkv` (not AsyncStorage) because it needs high-throughput writes.

---

## Database Writes

**The client NEVER writes directly to:**
- `territory_cells`
- `cell_captures`
- `zone_captures`
- `anticheat_log`

All mutations to these tables go through Edge Functions using the service-role key. The RLS policies enforce this — there are no INSERT/UPDATE policies on these tables for the anon/authenticated roles.

---

## GPS

**No background GPS under any circumstances.**

Only `expo-location`'s `watchPositionAsync` with foreground permissions is used. Never request background location. This is both a UX (battery) and App Store policy decision.

---

## Cell Hold Duration

**1 hour exactly.** Not 30 minutes. Not 2 hours.

In `submit-capture/index.ts`:
```ts
const HOLD_DURATION_MS = 60 * 60 * 1000; // 1 hour
```

The pg_cron job `expire-cells` runs every minute and NULLs out `held_until` for expired rows.

---

## Held Cell Behavior

**Held cells are silently skipped.** No error to the user, no penalty, no UI disruption beyond the `HeldCellSkip` component showing briefly.

In `captureService.ts`:
```ts
if (status === 'held') {
  processedCells.add(cell.id);
  useRunStore.getState().skipCell(); // increments cellsSkipped, nothing more
  return;
}
```

On the server, if a capture attempt hits a held cell, it returns HTTP 409. The client treats 409 as a silent no-op.

---

## Anti-Cheat

**Speed limit: 30 km/h** — captures from faster movement are rejected and logged.
**Minimum dwell: 18 seconds server-side** (client threshold is 20 s for a safety margin).
**Replay window: 120 seconds** — same user can't re-capture the same cell within 2 minutes.

All failures write to `anticheat_log` and call `increment_user_suspicion`. Never skip these checks.

---

## Payload Validation

**Always validate with Zod on both client AND server.** The schemas in `apps/mobile/src/lib/schemas.ts` and the inline schemas in each Edge Function must stay in sync.

---

## See Also
- [[Anti-Cheat System]] — detailed breakdown of the three checks
- [[Constants & Key Numbers]] — all the magic numbers
- [[Security & RLS]] — how RLS enforces the write restrictions
