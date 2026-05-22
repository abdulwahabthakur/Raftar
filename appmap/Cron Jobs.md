# Cron Jobs

4 pg_cron scheduled jobs defined in `backend/supabase/migrations/014_functions_and_cron.sql`.

---

## expire-cells
**Schedule:** Every minute (`* * * * *`)

```sql
UPDATE territory_cells
   SET held_until = NULL
 WHERE held_until IS NOT NULL
   AND held_until < now();
```

**What it does:** Releases expired cell hold locks. After 1 hour, `held_until` becomes `< now()` so this job NULLs it out, making the cell capturable again.

**Important:** This only clears the hold. **Ownership is NOT removed.** The cell still shows its owner — the hold just means it's no longer protected from being stolen. A new capture will update `owner_id` to the new runner.

**Index used:** The partial index `idx_territory_cells_held WHERE held_until IS NOT NULL` keeps this query fast even with millions of cells — it only scans the small subset of currently-held cells.

---

## decay-zone-strength
**Schedule:** Every hour (`0 * * * *`)

```sql
UPDATE zones
   SET strength = GREATEST(0, strength - 15),
       owner_id = CASE WHEN GREATEST(0, strength - 15) = 0 THEN NULL ELSE owner_id END,
       captured_at = CASE WHEN GREATEST(0, strength - 15) = 0 THEN NULL ELSE captured_at END
 WHERE owner_id IS NOT NULL
   AND (last_defended_at IS NULL OR last_defended_at < now() - INTERVAL '12 hours');
```

**What it does:**
- Every hour, if a zone hasn't been defended in 12 hours, its `strength` drops by 15
- `GREATEST(0, ...)` prevents going negative
- When `strength` reaches 0: `owner_id` → NULL, `captured_at` → NULL — the zone becomes neutral
- Defending = running through the zone and capturing cells within it (updates `last_defended_at`)

**Decay math:** A fully contested zone (strength 100) takes about 7 hours of inactivity to go neutral. A freshly captured zone (strength depends on implementation) decays proportionally.

---

## refresh-leaderboard
**Schedule:** Every 5 minutes (`*/5 * * * *`)

Rebuilds all 7 leaderboard cache slices using `ON CONFLICT DO UPDATE`:

| Board Type | Period | Source |
|---|---|---|
| `distance` | `today` | SUM(distance_meters) from runs today |
| `distance` | `week` | SUM(distance_meters) from runs this week |
| `distance` | `alltime` | `users.total_distance_meters` |
| `territory` | `today` | COUNT(*) from cell_captures today |
| `territory` | `week` | COUNT(*) from cell_captures this week |
| `territory` | `alltime` | `users.total_cells` |
| `domination` | `alltime` | COUNT(*) of currently owned cells per user |

Each slice is limited to **top 100** users.

**Note:** The `end-run` Edge Function also calls `refresh_leaderboard_cache()` immediately after a run ends, so the leaderboard updates right away rather than waiting up to 5 minutes.

---

## send-theft-notifications
**Schedule:** Every hour (`0 * * * *`)

```sql
SELECT net.http_post(
  url := current_setting('app.supabase_url') || '/functions/v1/send-territory-notifications',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.service_role_key')
  ),
  body := '{}'::jsonb
);
```

**What it does:** Uses `pg_net` to make an HTTP POST to the `send-territory-notifications` Edge Function. That function looks at recent cell captures, finds displaced owners, and sends push notifications.

**Requires:** `app.supabase_url` and `app.service_role_key` Postgres config settings to be set. These need to be configured via:
```sql
ALTER DATABASE postgres SET app.supabase_url = 'https://...';
ALTER DATABASE postgres SET app.service_role_key = 'eyJ...';
```

---

## See Also
- [[Database Migrations]] — migration 014 where these are defined
- [[Leaderboard System]] — how the cache is used
- [[Edge Functions]] — `send-territory-notifications` function
