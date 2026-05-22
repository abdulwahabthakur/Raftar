# Edge Functions

5 Deno functions in `backend/supabase/functions/`. All run on Supabase's edge runtime.

**Auth pattern:** Every function (except `send-territory-notifications`) requires `Authorization: Bearer <jwt>` and calls `supabase.auth.getUser()` to validate it. The Supabase client inside each function uses the **service-role key** so it can bypass RLS for writes.

---

## start-run

**File:** `backend/supabase/functions/start-run/index.ts`
**Method:** POST
**Called by:** `runService.startRun()` in the mobile app

### What it does
1. Validates JWT → gets user
2. Validates body with `StartRunSchema`: `{ startedAt: ISO string, deviceId: string }`
3. Checks if a `users` profile row exists — creates one if missing (safety net for edge cases)
4. Queries `runs` for any open run (`ended_at IS NULL`) for this user — returns 409 if found
5. Inserts new run row: `{ user_id, started_at }`
6. Returns `{ runId, startedAt }`

### Error responses
| Status | Condition |
|---|---|
| 401 | Missing or invalid JWT |
| 409 | Run already in progress (returns existing `runId`) |
| 422 | Invalid request body |
| 500 | DB error |

---

## end-run

**File:** `backend/supabase/functions/end-run/index.ts`
**Method:** POST
**Called by:** `runService.endRun()` in the mobile app

### What it does
1. Validates JWT
2. Validates body with `EndRunSchema`: `{ runId, endedAt, distanceMeters, route: { type: 'LineString', coordinates } }`
3. Fetches run — must belong to user and have `ended_at IS NULL`
4. Computes `durationSeconds = (endedAt - startedAt) / 1000`
5. Updates run: `ended_at`, `distance_meters`, `duration_seconds`, and PostGIS `LINESTRING` route (only if ≥2 GPS points)
6. Calls in parallel:
   - `update_streak(userId, runDate)` — maintains streak
   - `increment_user_run_stats(userId, distanceMeters)` — total_runs+1, total_distance+dist
7. Calls `refresh_leaderboard_cache()` so leaderboard updates immediately
8. Returns `{ run: Run }`

### Error responses
| Status | Condition |
|---|---|
| 401 | Missing or invalid JWT |
| 404 | Run not found or already ended |
| 422 | Invalid body |
| 500 | DB error |

---

## submit-capture

**File:** `backend/supabase/functions/submit-capture/index.ts`
**Method:** POST
**Called by:** `captureService.submitCapture()` in the mobile app

This is the **most critical** function. See [[Anti-Cheat System]] for a full breakdown of the three checks.

### What it does
1. Validates JWT
2. Validates body with `SubmitCaptureSchema`:
   ```ts
   {
     runId: UUID,
     cellId: UUID,
     enteredAt: ISO string,
     exitedAt: ISO string,
     gpsSlice: GPSPoint[],  // 2–50 points
     deviceId: string,
   }
   ```
3. Verifies run is active (belongs to user, `ended_at IS NULL`)
4. Fetches cell from `territory_cells`
5. **[Check 1] Server-side held check** → 409 if `held_until > now()`
6. **[Check 2] Dwell check** → 422 + anticheat log if dwell < 18 s
7. **[Check 3] Speed check** → 422 + anticheat log if max GPS speed > 30 km/h
8. **[Check 4] Replay check** → 409 + anticheat log if same user captured same cell in last 120 s
9. All pass:
   - `heldUntil = now + 1 hour`
   - INSERT `cell_captures`
   - UPDATE `territory_cells` (owner, held_until)
   - RPC `increment_cell_capture_count`
   - RPC `increment_run_cells_captured`
   - RPC `increment_user_cell_count`
10. Returns `{ captured: true, heldUntil }`

### Error responses
| Status | Condition |
|---|---|
| 401 | Missing/invalid JWT |
| 404 | Run not found or cell not found |
| 409 | Cell currently held OR replay attempt |
| 422 | Invalid body / dwell too short / speed violation |
| 500 | DB write failed |

---

## get-leaderboard

**File:** `backend/supabase/functions/get-leaderboard/index.ts`
**Method:** GET
**Called by:** `useLeaderboard` hook in the mobile app

### Query params
| Param | Values | Default |
|---|---|---|
| `type` | `distance`, `territory`, `domination` | `distance` |
| `period` | `today`, `week`, `alltime` | `week` |
| `limit` | 1–100 | `50` |

### What it does

**For `domination`:** Queries all `territory_cells` with an owner, tallies counts per user in memory, returns sorted ranking.

**For `distance` / `territory`:**
- `today` → runs where `started_at >= today at midnight`
- `week` → runs where `started_at >= 7 days ago`
- `alltime` → all completed runs
- Aggregates per user: sum of `distance_meters` (distance) or `cells_captured` (territory)
- Returns sorted entries

Returns: `{ boardType, period, entries: LeaderboardEntry[] }`

---

## send-territory-notifications

**File:** `backend/supabase/functions/send-territory-notifications/index.ts`
**Triggered by:** pg_cron every hour (via `pg_net.http_post` from within Postgres)

### What it does
- Looks at recent `cell_captures` entries where `previous_owner_id IS NOT NULL`
- For each displaced owner, fetches their `push_token`
- Sends an Expo push notification: "Your cell was captured by [username]!"
- Logs to `notification_log`

---

## Deploying

```bash
supabase functions deploy start-run
supabase functions deploy end-run
supabase functions deploy submit-capture
supabase functions deploy get-leaderboard
supabase functions deploy send-territory-notifications
```

Or deploy all at once:
```bash
supabase functions deploy
```

---

## See Also
- [[Anti-Cheat System]] — the checks inside `submit-capture`
- [[Cron Jobs]] — how `send-territory-notifications` is triggered
- [[Security & RLS]] — why service-role key is needed for writes
