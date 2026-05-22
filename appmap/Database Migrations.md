# Database Migrations

18 ordered SQL files in `backend/supabase/migrations/`. Run with `supabase db push`.

---

## 001 — Extensions
Enables required Postgres extensions:
- `postgis` — geospatial geometry types and functions
- `pgcrypto` — `uuid_generate_v4()`
- `pg_cron` — scheduled jobs
- `pg_net` — HTTP calls from inside Postgres (used to call Edge Fn from cron)

---

## 002 — Users

```sql
CREATE TABLE users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT NOT NULL UNIQUE,
  avatar_url   TEXT,
  push_token   TEXT,
  total_distance_meters BIGINT NOT NULL DEFAULT 0,
  total_cells  INT NOT NULL DEFAULT 0,
  total_runs   INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Also creates `handle_new_user()` trigger: auto-inserts a user row on Supabase Auth signup, using `raw_user_meta_data->>'username'` or fallback `'runner_' + first 8 chars of UUID`.

---

## 003 — Launch Zones

Top-level geographic regions where the game is active.
```sql
CREATE TABLE launch_zones (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name      TEXT NOT NULL,
  geometry  GEOMETRY(POLYGON, 4326) NOT NULL,
  ...
);
```

---

## 004 — Zones

Sub-regions within a launch zone (neighborhoods).
```sql
CREATE TABLE zones (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  launch_zone_id   UUID NOT NULL REFERENCES launch_zones(id),
  name             TEXT NOT NULL,
  geometry         GEOMETRY(POLYGON, 4326) NOT NULL,
  owner_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  strength         INT NOT NULL DEFAULT 0,     -- 0–100
  captured_at      TIMESTAMPTZ,
  last_defended_at TIMESTAMPTZ,
  ...
);
```

---

## 005 — Territory Cells

Individual capturable city-block polygons.

```sql
CREATE TABLE territory_cells (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id       UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  geometry      GEOMETRY(POLYGON, 4326) NOT NULL,
  owner_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  owned_at      TIMESTAMPTZ,
  held_until    TIMESTAMPTZ,   -- NULL = free; non-null = locked for 1 hour
  capture_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:**
- `GIST` index on `geometry` — spatial queries
- Index on `zone_id`
- Partial index on `owner_id WHERE owner_id IS NOT NULL`
- Partial index on `held_until WHERE held_until IS NOT NULL` — kept small, only locked cells

**View: `capturable_cells`**
```sql
SELECT * FROM territory_cells
WHERE held_until IS NULL OR held_until < now();
```

---

## 006 — Runs

```sql
CREATE TABLE runs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,         -- NULL = still in progress
  distance_meters  NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 0,
  cells_captured   INT NOT NULL DEFAULT 0,
  cells_skipped    INT NOT NULL DEFAULT 0,
  zones_captured   INT NOT NULL DEFAULT 0,
  route            GEOMETRY(LINESTRING, 4326),   -- full GPS path
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:**
- `(user_id, started_at DESC)` — user's run history
- `(started_at DESC)` — leaderboard time-range queries

---

## 007 — Cell Captures

Audit log of every successful cell capture.
```sql
CREATE TABLE cell_captures (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cell_id           UUID NOT NULL REFERENCES territory_cells(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  run_id            UUID NOT NULL REFERENCES runs(id),
  previous_owner_id UUID REFERENCES users(id),
  entered_at        TIMESTAMPTZ NOT NULL,
  exited_at         TIMESTAMPTZ NOT NULL,
  captured_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 008 — Zone Captures

Audit log of zone ownership changes (triggered when a zone's owner changes).

---

## 009 — Anticheat Log

Server-only. Clients have **zero access** (`USING(false)` RLS policy).

```sql
CREATE TABLE anticheat_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  run_id          UUID REFERENCES runs(id),
  event_type      TEXT NOT NULL,      -- 'dwell_too_short', 'speed_violation', 'replay_attempt'
  suspicion_score INT NOT NULL DEFAULT 0,
  metadata        JSONB,
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 010 — Leaderboard Cache

Pre-computed ranked rows. Rebuilt every 5 minutes by pg_cron and immediately after each run ends.

```sql
CREATE TABLE leaderboard_cache (
  board_type   TEXT NOT NULL,   -- 'distance', 'territory', 'domination'
  period       TEXT NOT NULL,   -- 'today', 'week', 'alltime'
  rank         INT NOT NULL,
  user_id      UUID NOT NULL REFERENCES users(id),
  value        NUMERIC NOT NULL,
  refreshed_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (board_type, period, rank)
);
```

---

## 011 — Streaks

Consecutive run-day tracking per user.

```sql
CREATE TABLE run_streaks (
  user_id        UUID PRIMARY KEY REFERENCES users(id),
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_run_date  DATE
);
```

---

## 012 — Notifications Log

Record of sent push notifications.
```sql
CREATE TABLE notification_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL,    -- e.g. 'cell_stolen'
  payload     JSONB,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 013 — RLS Policies

Enables Row Level Security on all tables and sets access rules. See [[Security & RLS]] for full detail.

---

## 014 — Functions & Cron

Creates `update_streak`, `increment_user_run_stats`, `refresh_leaderboard_cache` Postgres functions, and all four pg_cron jobs. See [[Cron Jobs]] for full detail.

---

## 015 — Spatial RPC

Creates the `cells_in_bounds` RPC:
```sql
SELECT * FROM territory_cells
WHERE ST_Intersects(geometry, ST_MakeEnvelope(west, south, east, north, 4326));
```
Called by the mobile app's `useViewportCells` hook whenever the map viewport changes.

---

## 016 — Seed GTA Launch Zone

Inserts the Greater Toronto Area as the first `launch_zones` row with its boundary polygon. The actual territory cells are populated separately by the `scripts/import-osm-blocks.ts` import script.

---

## 017 — Increment Functions

`SECURITY DEFINER` RPCs for atomic counter updates. Using RPC prevents race conditions that would occur with direct UPDATE + read.

| RPC | What it increments |
|---|---|
| `increment_cell_capture_count(p_cell_id)` | `territory_cells.capture_count` |
| `increment_run_cells_captured(p_run_id)` | `runs.cells_captured` |
| `increment_user_cell_count(p_user_id)` | `users.total_cells` |
| `increment_user_suspicion(p_user_id, p_score)` | user suspicion score |
| `increment_user_run_stats(p_user_id, p_distance_meters)` | `total_runs + 1`, `total_distance_meters += dist` |

---

## 018 — Grants

Final GRANT statements giving the Edge Function service role the permissions it needs to call the SECURITY DEFINER RPCs and write to the relevant tables.

---

## See Also
- [[Security & RLS]] — the full RLS policy list
- [[Cron Jobs]] — the scheduled job details
- [[Edge Functions]] — which RPCs each function calls
