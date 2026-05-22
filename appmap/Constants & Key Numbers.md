# Constants & Key Numbers

All magic numbers across the project in one place. If you change one, find every place it appears.

---

## GPS Tracking (`useRunTracker.ts`)

| Constant | Value | Meaning |
|---|---|---|
| `GPS_INTERVAL_MS` | `3000` | Minimum ms between location updates |
| Distance interval | `5` | Minimum meters moved to trigger update |
| `ACCURACY_THRESHOLD_M` | `20` | Discard GPS points with accuracy worse than 20 m |

## Capture Timing (`captureService.ts`)

| Constant | Value | Meaning |
|---|---|---|
| `CAPTURE_DWELL_SECS` | `20` | Client-side: must be inside cell for 20 s before submitting |

## Server-Side Capture (`submit-capture/index.ts`)

| Constant | Value | Meaning |
|---|---|---|
| `SPEED_LIMIT_KMH` | `30` | Max movement speed; above this = cheat flag |
| `MIN_DWELL_SECS` | `18` | Server-side dwell threshold (2 s below client for margin) |
| `REPLAY_WINDOW_SECS` | `120` | Blocks re-capture of same cell within 2 minutes |
| `HOLD_DURATION_MS` | `3_600_000` | 1 hour post-capture lock |

## Suspicion Scores (`submit-capture/index.ts`)

| Event | Score Added |
|---|---|
| `dwell_too_short` | +10 |
| `speed_violation` | +30 |
| `replay_attempt` | +20 |

## Presence System (`presenceService.ts`)

| Constant | Value | Meaning |
|---|---|---|
| `BROADCAST_INTERVAL_MS` | `8_000` | How often position is broadcast to other runners |
| `STALE_THRESHOLD_MS` | `15_000` | Discard presence packets older than 15 s |
| Channel name | `'runner-presence-gta'` | Supabase Realtime channel |

## GPS Buffer (`gpsBuffer.ts`)

| Constant | Value | Meaning |
|---|---|---|
| `MAX_POINTS` | `10_000` | Max GPS points kept in MMKV buffer before oldest are dropped |
| Max GPS slice sent | `50` | Zod enforces `.max(50)` on `gpsSlice` in the capture payload |

## Leaderboard (`get-leaderboard/index.ts`)

| Constant | Value | Meaning |
|---|---|---|
| Default limit | `50` | Rows returned if `?limit=` not specified |
| Hard cap | `100` | `Math.min(limit, 100)` — never returns more than 100 |

## Cron Schedules (`014_functions_and_cron.sql`)

| Job | Schedule | What it does |
|---|---|---|
| `expire-cells` | Every minute | NULLs `held_until` for expired locks |
| `decay-zone-strength` | Every hour | -15 strength if not defended in 12h |
| `refresh-leaderboard` | Every 5 minutes | Rebuilds all 7 leaderboard cache slices |
| `send-theft-notifications` | Every hour | Calls Edge Fn for push notifications |

## Zone Strength (`014_functions_and_cron.sql`)

| Constant | Value | Meaning |
|---|---|---|
| Decay amount | `15` | Strength lost per hour when undefended |
| Decay threshold | `12 hours` | Inactivity before decay kicks in |
| Neutral threshold | `0` | Zone becomes ownerless when strength hits 0 |

## Username Validation (`schemas.ts`)

| Rule | Value |
|---|---|
| Min length | `3` |
| Max length | `24` |
| Allowed chars | `[a-zA-Z0-9_-]` only |

---

## See Also
- [[Hard Rules]] — which of these are immutable
- [[Anti-Cheat System]] — how speed/dwell/replay are used
- [[Cron Jobs]] — the full cron schedule
