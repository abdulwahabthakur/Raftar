# Anti-Cheat System

Raftar's anti-cheat runs entirely on the server inside `submit-capture`. The client cannot influence these checks.

---

## The Three Checks (in order)

### Check 1 — Server-Side Held Lock
```ts
if (cell.held_until && new Date(cell.held_until) > new Date()) {
  return { error: 'Cell is currently held', heldUntil: cell.held_until }, 409
}
```
**Why:** The client does its own held check before submitting, but there's a race condition window — another runner could capture the cell between the client's check and the server receiving the request. The server is authoritative.

**Client behavior on 409:** Silent no-op. No error shown, no penalty.

---

### Check 2 — Dwell Time
```ts
const timeInsideSecs = (exitedAt - enteredAt) / 1000;
if (timeInsideSecs < 18) {
  // anticheat_log + suspicion +10 → HTTP 422
}
```
**Why:** Prevents running through cells too quickly. You need to physically spend time inside a cell.

**Client threshold is 20 s** — 2 seconds above the server threshold. This means a legitimate runner who spent 20+ s client-side will always pass the 18 s server check, even with minor clock drift.

**Suspicion score:** +10 (low — may be clock sync issues)

---

### Check 3 — Speed Check
```ts
function maxSpeedKmh(gpsSlice): number {
  // haversine between consecutive points / time delta → km/h
  // returns the maximum speed seen across the slice
}

if (maxSpeedKmh(gpsSlice) > 30) {
  // anticheat_log + suspicion +30 → HTTP 422
}
```
**Why:** Prevents driving. 30 km/h is above a fast sprint (~25 km/h) but well below any vehicle speed. The calculation uses the GPS slice sent by the client, which the client cannot fabricate without also passing the dwell check (they'd have to show slow movement for 18+ s).

**Suspicion score:** +30 (high — very unlikely to be accidental)

---

### Check 4 — Replay Rejection
```ts
const recentCapture = await supabase
  .from('cell_captures')
  .select('id')
  .eq('cell_id', cellId)
  .eq('user_id', user.id)
  .gte('captured_at', new Date(enteredMs - 120_000).toISOString())
  .limit(1)
  .single();

if (recentCapture) {
  // anticheat_log + suspicion +20 → HTTP 409
}
```
**Why:** Prevents replay attacks — replaying the same capture request (or re-running the same cell immediately after the hold expires). The 120-second window means you can recapture a cell after 2 minutes, but not instantly.

**Client behavior on 409:** Silent no-op (same as held check).

**Suspicion score:** +20

---

## Suspicion Score System

Each user in `users` has a `suspicion_score` (from migration 017 RPC `increment_user_suspicion`). It accumulates across all violations.

| Violation | Score |
|---|---|
| Dwell too short | +10 |
| Replay attempt | +20 |
| Speed violation | +30 |

Currently the score is logged and accumulated. Future work: automated bans at a threshold, or manual review queue for high-suspicion users.

---

## Anti-Cheat Log

`anticheat_log` table stores every violation with:
- `user_id`, `run_id`
- `event_type` — `'dwell_too_short'` / `'speed_violation'` / `'replay_attempt'`
- `suspicion_score` — score added for this event
- `metadata` JSONB — varies by event type:
  - `dwell_too_short`: `{ timeInsideSecs, cellId }`
  - `speed_violation`: `{ maxSpeedKmh, cellId, deviceId }`
  - `replay_attempt`: `{ cellId, priorCaptureId }`

**RLS policy:** `USING(false)` — **completely inaccessible to all clients**, even authenticated ones. Only the service-role key can read it.

---

## Device ID

Every capture submission includes a `deviceId` from `expo-secure-store`. It's included in the `anticheat_log` metadata for speed violations. Allows correlating violations across multiple user accounts on the same device.

---

## What the Anti-Cheat Does NOT Cover (Yet)

- **GPS spoofing** — fake GPS coordinates are hard to detect without OS-level attestation. The speed check partially mitigates teleportation (speeds of 100+ km/h would be flagged).
- **Emulators** — could spoof GPS freely. Future: SafetyNet/Play Integrity (Android), DeviceCheck (iOS).
- **Multiple accounts** — device ID helps but a new device bypasses it.
- **Automated bans** — suspicion score accumulates but no automated action is taken yet.

---

## See Also
- [[Capture Flow]] — where in the sequence these checks run
- [[Edge Functions]] — `submit-capture` full context
- [[Hard Rules]] — the speed limit and dwell times are fixed constants
- [[Constants & Key Numbers]] — all the threshold values
